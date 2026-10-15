import { z } from "zod";
import type Stripe from "stripe";
import { observeDelivery } from "./delivery-observations";
import {
  ideaLifecycleApprovalHolds,
  readIdeaLifecycle,
  type CommercialOutcome,
  type LifecycleObservations,
} from "./idea-lifecycle";
import { readDeliveryMetadata } from "./delivery-types";
import { canonicalHash } from "./portfolio-control-plane";
import type { CommandCentreProject } from "./registry";
import type { CommandCentreTask } from "./tasks";

/** Read-only SDK slice; callers reuse the server's existing getStripe() accessor.
 * Docs checked 15/10/2026: https://docs.stripe.com/api/charges/list,
 * https://docs.stripe.com/api/checkout/sessions/list,
 * https://docs.stripe.com/api/checkout/sessions/line_items,
 * https://docs.stripe.com/api/accounts/retrieve,
 * https://docs.stripe.com/api/refunds/list.
 * No URLs supplied by research, customers or provider responses are fetched.
 */
export interface StripeLifecycleReadClient {
  accounts: {
    retrieve(
      id: string | null,
      params?: Stripe.AccountRetrieveParams,
      options?: Stripe.RequestOptions,
    ): Promise<unknown>;
  };
  charges: {
    list(
      params: Stripe.ChargeListParams,
      options?: Stripe.RequestOptions,
    ): Promise<unknown>;
    retrieve(
      id: string,
      params?: Stripe.ChargeRetrieveParams,
      options?: Stripe.RequestOptions,
    ): Promise<unknown>;
  };
  refunds: {
    list(
      params: Stripe.RefundListParams,
      options?: Stripe.RequestOptions,
    ): Promise<unknown>;
  };
  checkout: {
    sessions: {
      list(
        params: Stripe.Checkout.SessionListParams,
        options?: Stripe.RequestOptions,
      ): Promise<unknown>;
      listLineItems(
        id: string,
        params: Stripe.Checkout.SessionListLineItemsParams,
        options?: Stripe.RequestOptions,
      ): Promise<unknown>;
    };
  };
}

const providerId = z
  .string()
  .regex(/^[a-z]+_[A-Za-z0-9]+$/)
  .max(255);
const reference = z
  .union([providerId, z.object({ id: providerId })])
  .nullable();
const money = z.number().int().nonnegative().safe();
const chargeSchema = z.object({
  id: providerId,
  customer: reference,
  payment_intent: reference,
  livemode: z.boolean(),
  paid: z.boolean(),
  captured: z.boolean(),
  status: z.enum(["succeeded", "pending", "failed"]),
  refunded: z.boolean(),
  disputed: z.boolean(),
  amount: money,
  amount_captured: money,
  amount_refunded: money,
  currency: z.string().regex(/^[a-z]{3}$/),
  created: z.number().int().nonnegative().safe(),
});
const sessionSchema = z.object({
  id: providerId,
  customer: reference,
  payment_intent: reference,
  livemode: z.boolean(),
  status: z.string().nullable(),
  payment_status: z.string(),
  mode: z.string(),
  currency: z.string().nullable(),
  amount_total: money.nullable(),
});
const lineSchema = z.object({
  currency: z.string(),
  amount_total: money,
  price: z.object({ product: reference, currency: z.string() }).nullable(),
});
const page = <T>(schema: z.ZodType<T>, maximum: number) =>
  z.object({
    data: z.array(schema).max(maximum),
    has_more: z.boolean(),
  });
const identity = (value: z.infer<typeof reference>) =>
  typeof value === "string" ? value : (value?.id ?? null);

export interface LifecycleObservationDeps {
  token?: string;
  stripe?: StripeLifecycleReadClient | null;
  fetchFn?: typeof fetch;
  now?: () => Date;
  /** Set only after the service verifies the current signed delivery approval. */
  deliveryAuthorityVerified?: boolean;
  /** Server/test budget, never accepted from a browser command. */
  maximumDurationMs?: number;
}

/** Called only with server-loaded task/contract; browser evidence never enters here. */
export async function observeIdeaLifecycle(
  task: CommandCentreTask,
  project: CommandCentreProject | undefined,
  outcome: CommercialOutcome | null,
  deps: LifecycleObservationDeps,
): Promise<LifecycleObservations> {
  const observedAt = (deps.now?.() ?? new Date()).toISOString();
  const deadline =
    Date.now() +
    Math.min(25_000, Math.max(1, deps.maximumDurationMs ?? 25_000));
  const lifecycle = readIdeaLifecycle(task.metadata);
  const result: LifecycleObservations = {
    observedAt,
    lifecycleRevision: lifecycle?.revision ?? 0,
    briefHash: lifecycle?.brief?.hash ?? null,
    outcomeHash: lifecycle?.outcome ? canonicalHash(lifecycle.outcome) : null,
    sources: {
      github: "not_connected",
      stripe: "not_connected",
      activation: "not_connected",
      deployment: "not_connected",
    },
    activations: [],
    payments: [],
    limitations: [
      "Provider deployments do not prove a working live user journey; no trusted live-journey or activation connector is available here.",
      "Required branch checks and independent reviewer eligibility are not evaluated; engineering check/review verification remains blocked.",
      "Payment reads cover fully captured one-off Checkout payments created in the agreed window; subscription renewals and mixed-product baskets are not verified. Actual refund/dispute flags are retained and excluded from eligible-client counts.",
      "Pending, unquantified or truncated refund evidence is excluded; net amounts mean captured amounts less recorded refunds, before provider fees.",
      "Customer references are distinct Stripe customer IDs, not independently verified distinct legal buyers.",
    ],
  };
  if (
    !lifecycle ||
    canonicalHash(outcome) !== canonicalHash(lifecycle.outcome)
  ) {
    result.limitations.push(
      "A valid saved lifecycle and matching outcome contract are required for trusted observations.",
    );
    return result;
  }
  const delivery = readDeliveryMetadata(task);
  const deliveryBound =
    deps.deliveryAuthorityVerified === true &&
    ideaLifecycleApprovalHolds(lifecycle) &&
    delivery?.sourceRefs.some(
      (source) => source.reference === `idea-brief:${lifecycle.brief!.hash}`,
    );
  if (deliveryBound) {
    const github = await observeDelivery(task, project, {
      token: deps.token,
      fetchFn: deps.fetchFn,
      now: () => new Date(observedAt),
    });
    result.sources.github =
      !deps.token?.trim() || github.state === "not_connected"
        ? "not_connected"
        : github.state === "observed" || github.state === "partial"
          ? "connected"
          : "error";
    result.limitations.push(...github.limitations);
    if (
      github.pr &&
      github.headSha &&
      project?.github_repo &&
      (!outcome ||
        outcome.repository.toLowerCase() === project.github_repo.toLowerCase())
    ) {
      const merged =
        github.pr.merged &&
        github.pr.state === "closed" &&
        !github.pr.draft &&
        github.pr.baseBranch === "main" &&
        Boolean(github.pr.mergeSha) &&
        Boolean(github.pr.mergedAt) &&
        Date.parse(github.pr.mergedAt!) <= Date.parse(observedAt);
      result.engineering = {
        repository: project.github_repo,
        baseBranch: github.pr.baseBranch ?? "unknown",
        headSha: github.headSha,
        mergeSha: merged ? github.pr.mergeSha : null,
        prUrl: github.pr.reference,
        merged,
        checksPassed: false,
        reviewApproved: false,
      };
    }
  } else {
    result.limitations.push(
      "Engineering evidence requires current signed delivery authority bound to this exact approved idea brief.",
    );
  }
  if (!outcome) {
    result.limitations.push(
      "An agreed commercial outcome contract is required before payment reconciliation.",
    );
    return result;
  }
  if (!deps.stripe) {
    result.limitations.push(
      "Stripe evidence access is unavailable in this runtime.",
    );
    return result;
  }
  const stripe = deps.stripe;
  try {
    const read = async <T>(
      request: (options: Stripe.RequestOptions) => Promise<T>,
    ): Promise<T> => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("Observation deadline reached");
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          request({ timeout: Math.min(8000, remaining), maxNetworkRetries: 0 }),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error("Observation deadline reached")),
              remaining,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };
    const account = z
      .object({ id: providerId })
      .parse(
        await read((options) => stripe.accounts.retrieve(null, {}, options)),
      );
    if (account.id !== outcome.stripeAccountId)
      throw new Error("Account mismatch");
    result.stripeAccountId = account.id;
    const start = Date.parse(outcome.windowStart);
    const end = Math.min(Date.parse(outcome.windowEnd), Date.parse(observedAt));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      result.sources.stripe = "connected";
      result.limitations.push(
        "The agreed payment window has not opened or is invalid.",
      );
      return result;
    }
    // One bounded page. Incomplete coverage cannot replace an earlier current-health snapshot.
    const charges = page(chargeSchema, 50).parse(
      await read((options) =>
        stripe.charges.list(
          {
            created: {
              gte: Math.ceil(start / 1000),
              lte: Math.floor(end / 1000),
            },
            limit: 50,
          },
          options,
        ),
      ),
    );
    if (charges.has_more) throw new Error("Payment coverage incomplete");
    const seen = new Set<string>();
    for (const listed of charges.data) {
      if (seen.has(listed.id)) continue;
      seen.add(listed.id);
      const eligible = (charge: z.infer<typeof chargeSchema>) => {
        const created = charge.created * 1000;
        return (
          charge.livemode &&
          charge.paid &&
          charge.captured &&
          charge.status === "succeeded" &&
          charge.amount_refunded <= charge.amount_captured &&
          (!charge.refunded || charge.amount_refunded > 0) &&
          charge.amount_captured === charge.amount &&
          charge.amount_captured > 0 &&
          charge.currency.toUpperCase() === outcome.currency &&
          created >= start &&
          created <= end &&
          Boolean(identity(charge.customer)) &&
          Boolean(identity(charge.payment_intent))
        );
      };
      if (!eligible(listed)) continue;
      const sessions = page(sessionSchema, 2).parse(
        await read((options) =>
          stripe.checkout.sessions.list(
            {
              payment_intent: identity(listed.payment_intent)!,
              limit: 2,
            },
            options,
          ),
        ),
      );
      if (sessions.has_more || sessions.data.length !== 1) continue;
      const session = sessions.data[0];
      if (
        !session.livemode ||
        session.status !== "complete" ||
        session.payment_status !== "paid" ||
        session.mode !== "payment" ||
        identity(session.customer) !== identity(listed.customer) ||
        identity(session.payment_intent) !== identity(listed.payment_intent) ||
        session.currency !== listed.currency ||
        session.amount_total !== listed.amount_captured
      )
        continue;
      const lines = page(lineSchema, 100).parse(
        await read((options) =>
          stripe.checkout.sessions.listLineItems(
            session.id,
            { limit: 100 },
            options,
          ),
        ),
      );
      if (
        lines.has_more ||
        !lines.data.length ||
        lines.data.some(
          (line) =>
            identity(line.price?.product ?? null) !== outcome.productId ||
            line.currency !== listed.currency ||
            line.price?.currency !== listed.currency,
        ) ||
        lines.data.reduce((total, line) => total + line.amount_total, 0) !==
          listed.amount_captured
      )
        continue;
      // Check current refund/dispute/capture state again after attribution reads.
      const current = chargeSchema.parse(
        await read((options) =>
          stripe.charges.retrieve(listed.id, {}, options),
        ),
      );
      const refunds = page(
        z.object({ id: providerId, status: z.string() }),
        1,
      ).parse(
        await read((options) =>
          stripe.refunds.list({ charge: listed.id, limit: 1 }, options),
        ),
      );
      if (
        refunds.has_more ||
        refunds.data.some(
          (refund) =>
            !["succeeded", "failed", "canceled"].includes(refund.status),
        ) ||
        (!refunds.data.length && current.amount_refunded > 0) ||
        !eligible(current) ||
        current.id !== listed.id ||
        identity(current.customer) !== identity(listed.customer) ||
        identity(current.payment_intent) !== identity(listed.payment_intent) ||
        current.amount_refunded < listed.amount_refunded ||
        (listed.disputed && !current.disputed) ||
        current.amount !== listed.amount ||
        current.created !== listed.created
      )
        continue;
      result.payments.push({
        eventId: `stripe:${account.id}:${current.id}`,
        paymentId: current.id,
        customerId: identity(current.customer)!,
        productId: outcome.productId,
        currency: current.currency.toUpperCase(),
        amountMinor: current.amount_captured,
        refundedMinor: current.amount_refunded,
        disputed: current.disputed,
        live: true,
        status: "succeeded",
        occurredAt: new Date(current.created * 1000).toISOString(),
      });
    }
    result.sources.stripe = "connected";
  } catch {
    // Never forward SDK errors: authentication errors can contain credential fragments.
    result.sources.stripe = "error";
    result.payments = [];
    result.limitations.push(
      "Stripe access failed, the refresh deadline expired, account identity differed, or bounded evidence coverage was incomplete; refresh or narrow the agreed window.",
    );
  }
  return result;
}
