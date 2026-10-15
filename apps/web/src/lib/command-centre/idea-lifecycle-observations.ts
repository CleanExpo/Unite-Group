import { z } from "zod";
import type Stripe from "stripe";
import {
  observeDelivery,
  registeredPullRequest,
  type DeliveryObservations,
} from "./delivery-observations";
import {
  deriveGates,
  type CheckRun,
} from "../mission-authority/release-controller";
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

const githubName = z.string().trim().min(1).max(1000);
const githubId = z.number().int().positive().safe();
const githubSha = z.string().regex(/^[a-f0-9]{40}$/i);
const requiredCheckSchema = z.object({
  context: githubName,
  app_id: z.number().int().nullable(),
});
const protectionSchema = z.object({
  required_status_checks: z
    .object({
      contexts: z.array(githubName).max(100),
      checks: z.array(requiredCheckSchema).max(100),
    })
    .nullable(),
  required_pull_request_reviews: z.unknown().nullable(),
});
const branchRulesSchema = z
  .array(z.object({ type: githubName, parameters: z.unknown().optional() }))
  .max(100);
const providerCheckSchema = z.object({
  id: githubId,
  name: githubName,
  head_sha: githubSha,
  status: githubName,
  conclusion: z.string().nullable(),
  details_url: z.string().nullable(),
  app: z.object({ id: githubId, slug: githubName }),
  check_suite: z.object({ id: githubId }),
});
const providerStatusSchema = z.object({
  id: githubId,
  context: githubName,
  state: githubName,
});
const providerChecksPageSchema = z.object({
  total_count: z.number().int().nonnegative(),
  check_runs: z.array(providerCheckSchema).max(100),
});
const providerStatusesPageSchema = z.object({
  sha: githubSha,
  total_count: z.number().int().nonnegative(),
  statuses: z.array(providerStatusSchema).max(100),
});
const actionJobSchema = z.object({
  id: githubId,
  run_id: githubId,
  run_attempt: githubId,
  head_sha: githubSha,
  name: githubName,
  status: githubName,
  conclusion: z.string().nullable(),
  check_run_url: z.string(),
});
const actionRunSchema = z.object({
  id: githubId,
  run_attempt: githubId,
  check_suite_id: githubId,
  head_sha: githubSha,
  path: githubName,
  event: githubName,
  status: githubName,
  conclusion: z.string().nullable(),
  repository: z.object({ full_name: githubName }),
});

/** Same exact-SHA/completed-success gate as the existing release controller.
 * Policy is observed from GitHub, including legacy statuses and active rulesets.
 * GitHub Actions jobs additionally bind the provider's run, attempt and registered
 * CI workflow, following scripts/ci-evidence-manifest.mjs's provenance checks.
 */
async function observeRequiredChecks(
  github: DeliveryObservations,
  repo: string,
  deps: LifecycleObservationDeps,
  deadline: number,
): Promise<{ passed: boolean; stale: boolean; limitation?: string }> {
  const pr = registeredPullRequest(github.pr?.reference ?? "", repo);
  if (!pr || !github.headSha || !deps.token)
    return { passed: false, stale: false };
  const head = github.headSha;
  const get = async (path: string) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Observation deadline expired");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          const response = await (deps.fetchFn ?? fetch)(
            `https://api.github.com/repos/${repo}${path}`,
            {
              headers: {
                authorization: `Bearer ${deps.token}`,
                accept: "application/vnd.github+json",
                "x-github-api-version": "2022-11-28",
              },
              redirect: "error",
              cache: "no-store",
              signal: AbortSignal.timeout(Math.min(8000, remaining)),
            },
          );
          if (
            !response.ok ||
            /rel="next"/.test(response.headers.get("link") ?? "")
          )
            throw new Error("Incomplete provider evidence");
          const body = await response.text();
          if (body.length > 2_000_000)
            throw new Error("Provider evidence exceeded limit");
          return JSON.parse(body) as unknown;
        })(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Observation deadline expired")),
            Math.min(8000, remaining),
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  try {
    const [rawProtection, rawRules, rawChecks, rawStatuses] = await Promise.all(
      [
        get("/branches/main/protection"),
        get("/rules/branches/main"),
        get(`/commits/${head}/check-runs?filter=latest&per_page=100`),
        get(`/commits/${head}/status?per_page=100`),
      ],
    );
    const protection = protectionSchema.parse(rawProtection);
    const rules = branchRulesSchema.parse(rawRules);
    // This proves CI, not overall merge permission. Non-CI rules (signatures,
    // linear history, review counts, etc.) belong to their separate gates.
    if (
      rules.some((rule) => ["workflows", "code_scanning"].includes(rule.type))
    )
      throw new Error("Additional required policy is not supported");
    const required = [...(protection.required_status_checks?.checks ?? [])];
    for (const context of protection.required_status_checks?.contexts ?? []) {
      if (!required.some((check) => check.context === context))
        required.push({ context, app_id: null });
    }
    for (const rule of rules.filter(
      (rule) => rule.type === "required_status_checks",
    )) {
      const parameters = z
        .object({
          required_status_checks: z
            .array(
              z.object({
                context: githubName,
                integration_id: z.number().int().nullable().optional(),
              }),
            )
            .max(100),
        })
        .parse(rule.parameters);
      required.push(
        ...parameters.required_status_checks.map((check) => ({
          context: check.context,
          app_id: check.integration_id ?? null,
        })),
      );
    }
    const checks = providerChecksPageSchema.parse(rawChecks);
    const statuses = providerStatusesPageSchema.parse(rawStatuses);
    if (
      checks.total_count > checks.check_runs.length ||
      statuses.total_count > statuses.statuses.length ||
      statuses.sha !== head ||
      checks.check_runs.some((check) => check.head_sha !== head)
    )
      throw new Error("Incomplete or mismatched commit evidence");
    const runs = new Map<number, Promise<z.infer<typeof actionRunSchema>>>();
    const authenticateCheck = async (
      check: z.infer<typeof providerCheckSchema>,
    ) => {
      if (check.app.id === 15368 && check.app.slug !== "github-actions")
        return false;
      if (check.app.slug === "github-actions" && check.app.id !== 15368)
        return false;
      if (check.app.slug !== "github-actions") return true;
      const url = new URL(check.details_url ?? "");
      const match =
        /^\/([^/]+)\/([^/]+)\/actions\/runs\/([1-9][0-9]*)\/job\/([1-9][0-9]*)$/.exec(
          url.pathname,
        );
      if (
        url.origin !== "https://github.com" ||
        url.search ||
        url.hash ||
        !match ||
        `${match[1]}/${match[2]}`.toLowerCase() !== repo.toLowerCase()
      )
        return false;
      const runId = Number(match[3]);
      const jobId = Number(match[4]);
      if (!Number.isSafeInteger(runId) || !Number.isSafeInteger(jobId))
        return false;
      if (!runs.has(runId))
        runs.set(
          runId,
          get(`/actions/runs/${runId}`).then((body) =>
            actionRunSchema.parse(body),
          ),
        );
      const [run, job] = await Promise.all([
        runs.get(runId)!,
        get(`/actions/jobs/${jobId}`).then((body) =>
          actionJobSchema.parse(body),
        ),
      ]);
      return (
        run.id === runId &&
        job.id === jobId &&
        job.run_id === run.id &&
        job.run_attempt === run.run_attempt &&
        job.head_sha === head &&
        run.head_sha === head &&
        run.check_suite_id === check.check_suite.id &&
        run.repository.full_name.toLowerCase() === repo.toLowerCase() &&
        run.path === ".github/workflows/ci.yml" &&
        ["pull_request", "push"].includes(run.event) &&
        job.name === check.name &&
        job.status === "completed" &&
        job.conclusion === "success" &&
        job.check_run_url ===
          `https://api.github.com/repos/${repo}/check-runs/${check.id}`
      );
    };
    // Keep provider calls bounded even if policy names many checks.
    if (required.length > 30)
      throw new Error("Required policy exceeds bounded coverage");
    const observed: CheckRun[] = [];
    for (let offset = 0; offset < required.length; offset += 5) {
      const batch = await Promise.all(
        required.slice(offset, offset + 5).map(async (requiredCheck) => {
          const matching = checks.check_runs.filter(
            (check) =>
              check.name === requiredCheck.context &&
              (requiredCheck.app_id === null ||
                requiredCheck.app_id === -1 ||
                check.app.id === requiredCheck.app_id),
          );
          const compatible =
            matching.length > 0 &&
            matching.every(
              (check) =>
                check.status === "completed" && check.conclusion === "success",
            ) &&
            (await Promise.all(matching.map(authenticateCheck))).every(Boolean);
          const latestStatus = statuses.statuses
            .filter((status) => status.context === requiredCheck.context)
            .sort((a, b) => b.id - a.id)[0];
          const statusPass =
            (requiredCheck.app_id === null || requiredCheck.app_id === -1) &&
            latestStatus?.state === "success";
          // GitHub requires both a check and a status when they share a required
          // context. A success on either source must never hide the other's
          // failure, skip or pending state. An unbound status cannot satisfy a
          // policy that explicitly pins a GitHub App.
          const passed =
            (matching.length > 0 || statusPass) &&
            (matching.length === 0 || compatible) &&
            (!latestStatus || latestStatus.state === "success");
          return {
            name: requiredCheck.context,
            headSha: head,
            status: "completed",
            conclusion: passed ? "success" : "failure",
          };
        }),
      );
      observed.push(...batch);
    }
    const [finalProtection, finalRules, finalPr, finalChecks, finalStatuses] =
      await Promise.all([
        get("/branches/main/protection"),
        get("/rules/branches/main"),
        get(`/pulls/${pr.number}`),
        get(`/commits/${head}/check-runs?filter=latest&per_page=100`),
        get(`/commits/${head}/status?per_page=100`),
      ]);
    const runBinding = (run: z.infer<typeof actionRunSchema>) => [
      run.id,
      run.run_attempt,
      run.check_suite_id,
      run.head_sha,
      run.path,
      run.event,
      run.repository.full_name.toLowerCase(),
    ];
    const actionRunsChanged = (
      await Promise.all(
        [...runs.entries()].map(
          async ([id, initial]) =>
            canonicalHash(runBinding(await initial)) !==
            canonicalHash(
              runBinding(
                actionRunSchema.parse(await get(`/actions/runs/${id}`)),
              ),
            ),
        ),
      )
    ).some(Boolean);
    const current = z
      .object({
        number: githubId,
        head: z.object({ sha: githubSha }),
        base: z.object({
          ref: githubName,
          repo: z.object({ full_name: githubName }),
        }),
        merged: z.boolean(),
        draft: z.boolean(),
        state: z.string(),
        merge_commit_sha: githubSha.nullable().optional(),
        merged_at: z.string().nullable().optional(),
      })
      .parse(finalPr);
    const stale =
      current.number !== pr.number ||
      current.head.sha !== head ||
      current.base.ref !== github.pr?.baseBranch ||
      current.base.repo.full_name.toLowerCase() !== repo.toLowerCase() ||
      current.merged !== github.pr?.merged ||
      current.draft !== github.pr?.draft ||
      current.state !== github.pr?.state ||
      (current.merge_commit_sha ?? null) !== github.pr?.mergeSha ||
      (current.merged_at ?? null) !== github.pr?.mergedAt ||
      canonicalHash(protectionSchema.parse(finalProtection)) !==
        canonicalHash(protection) ||
      canonicalHash(branchRulesSchema.parse(finalRules)) !==
        canonicalHash(rules) ||
      canonicalHash(providerChecksPageSchema.parse(finalChecks)) !==
        canonicalHash(checks) ||
      canonicalHash(providerStatusesPageSchema.parse(finalStatuses)) !==
        canonicalHash(statuses) ||
      actionRunsChanged;
    if (stale)
      return {
        passed: false,
        stale: true,
        limitation:
          "Pull request, required-check policy or current check execution changed during observation; refresh trusted evidence.",
      };
    const gates = deriveGates({
      candidateSha: head,
      requiredChecks: required.map((check) => check.context),
      checkRuns: observed,
      tree: null,
      reviewedSha: null,
      reviewVerdict: null,
      reviewerAgent: null,
      builderAgent: "unknown",
      receiptSha: null,
      changedPaths: [],
      reviewBlockingSeverities: null,
      spend: null,
      rollbackReceipt: null,
      postReleaseVerification: null,
      infrastructureReceipt: null,
    });
    return {
      passed: gates.required_ci_green,
      stale: false,
      ...(!gates.required_ci_green
        ? {
            limitation:
              "Every required GitHub check and status must have authenticated, complete success evidence on this exact commit.",
          }
        : {}),
    };
  } catch {
    return {
      passed: false,
      stale: false,
      limitation:
        "Required GitHub policy, check provenance or bounded evidence coverage could not be verified; no passing check gate is inferred.",
    };
  }
}

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
      "Independent review requires an authenticated exact-commit report with verified reviewer provenance; a GitHub approval or advisory success alone is insufficient.",
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
      const checks = await observeRequiredChecks(
        github,
        project.github_repo,
        deps,
        deadline,
      );
      if (checks.stale) {
        result.engineering = undefined;
        result.sources.github = "error";
      } else {
        result.engineering.checksPassed = checks.passed;
      }
      if (checks.limitation) result.limitations.push(checks.limitation);
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
