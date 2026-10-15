import { describe, expect, it, vi } from "vitest";
import {
  observeIdeaLifecycle,
  type StripeLifecycleReadClient,
} from "../idea-lifecycle-observations";
import {
  applyLifecycleCommand,
  createIdeaLifecycle,
  readIdeaLifecycle,
  type CommercialOutcome,
} from "../idea-lifecycle";
import { observationFixture, headSha } from "./delivery-observations.fixture";
import { canonicalHash } from "../portfolio-control-plane";

const observedAt = "2026-10-15T10:00:00Z";
const outcome: CommercialOutcome = {
  repository: "CleanExpo/Unite-Group",
  baseBranch: "main",
  productId: "prod_portal",
  stripeAccountId: "acct_founder",
  activationEvent: "first_value",
  requiredClients: 1,
  currency: "AUD",
  minimumNetMinor: 100,
  windowStart: "2026-10-01T00:00:00Z",
  windowEnd: "2026-10-31T00:00:00Z",
};
const charge = {
  id: "ch_paid",
  customer: "cus_buyer",
  payment_intent: "pi_order",
  livemode: true,
  paid: true,
  captured: true,
  status: "succeeded",
  refunded: false,
  disputed: false,
  amount: 1000,
  amount_captured: 1000,
  amount_refunded: 0,
  currency: "aud",
  created: Date.parse("2026-10-10T00:00:00Z") / 1000,
};
const session = {
  id: "cs_order",
  customer: "cus_buyer",
  payment_intent: "pi_order",
  livemode: true,
  status: "complete",
  payment_status: "paid",
  mode: "payment",
  currency: "aud",
  amount_total: 1000,
};
const line = {
  currency: "aud",
  amount_total: 1000,
  price: { product: "prod_portal", currency: "aud" },
};
const page = (data: unknown[], has_more = false) => ({ data, has_more });
function stripeProvider() {
  return {
    accounts: { retrieve: vi.fn(async () => ({ id: "acct_founder" })) },
    charges: {
      list: vi.fn(async () => page([charge])),
      retrieve: vi.fn(async () => charge),
    },
    refunds: { list: vi.fn(async () => page([])) },
    checkout: {
      sessions: {
        list: vi.fn(async () => page([session])),
        listLineItems: vi.fn(async () => page([line])),
      },
    },
  };
}
const run = (
  stripe: StripeLifecycleReadClient | null = stripeProvider(),
  contract: CommercialOutcome | null = outcome,
) => {
  const { task, project } = lifecycleFixture(contract);
  return observeIdeaLifecycle(task, project, contract, {
    stripe,
    now: () => new Date(observedAt),
  });
};
function lifecycleFixture(contract: CommercialOutcome | null = outcome) {
  const fixture = observationFixture();
  fixture.task.metadata.lifecycle = {
    ...createIdeaLifecycle(
      {
        title: "A portal",
        rawIdea: "A customer portal",
        requestId: "33333333-3333-4333-8333-333333333333",
      },
      { actorId: "11111111-1111-4111-8111-111111111111", now: observedAt },
    ),
    outcome: contract,
  };
  return fixture;
}

describe("trusted lifecycle payment observations", () => {
  it("retains only minimal provider identities from a captured live product payment", async () => {
    const stripe = stripeProvider();
    const result = await run(stripe);
    expect(result.sources).toEqual({
      github: "not_connected",
      stripe: "connected",
      activation: "not_connected",
      deployment: "not_connected",
    });
    expect(result.payments).toEqual([
      {
        eventId: "stripe:acct_founder:ch_paid",
        paymentId: "ch_paid",
        customerId: "cus_buyer",
        productId: "prod_portal",
        currency: "AUD",
        amountMinor: 1000,
        refundedMinor: 0,
        disputed: false,
        live: true,
        status: "succeeded",
        occurredAt: "2026-10-10T00:00:00.000Z",
      },
    ]);
    expect(stripe.charges.list).toHaveBeenCalledWith(
      {
        created: {
          gte: Date.parse(outcome.windowStart) / 1000,
          lte: Date.parse(observedAt) / 1000,
        },
        limit: 50,
      },
      expect.objectContaining({
        timeout: expect.any(Number),
        maxNetworkRetries: 0,
      }),
    );
    expect(stripe.checkout.sessions.list).toHaveBeenCalledWith(
      { payment_intent: "pi_order", limit: 2 },
      expect.objectContaining({
        timeout: expect.any(Number),
        maxNetworkRetries: 0,
      }),
    );
    expect(result.activations).toEqual([]);
    expect(result.release).toBeUndefined();
    expect(stripe.accounts.retrieve).toHaveBeenCalledWith(
      null,
      {},
      expect.objectContaining({
        timeout: expect.any(Number),
        maxNetworkRetries: 0,
      }),
    );
    expect(result).toMatchObject({
      lifecycleRevision: 1,
      briefHash: null,
      outcomeHash: canonicalHash(outcome),
      stripeAccountId: "acct_founder",
    });
  });
  it("cannot replace the saved contract with caller assertions or observe invalid saved state", async () => {
    const stripe = stripeProvider();
    const { task, project } = lifecycleFixture();
    const mismatched = await observeIdeaLifecycle(
      task,
      project,
      { ...outcome, currency: "USD" },
      { stripe },
    );
    expect(mismatched.payments).toEqual([]);
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
    task.metadata.lifecycle = { kind: "idea_to_done" };
    const invalid = await observeIdeaLifecycle(task, project, outcome, {
      stripe,
    });
    expect(invalid.lifecycleRevision).toBe(0);
    expect(invalid.payments).toEqual([]);
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
  });
  it("does not invent a connected source without credentials or an agreed contract", async () => {
    expect((await run(null)).sources.stripe).toBe("not_connected");
    const stripe = stripeProvider();
    expect((await run(stripe, null)).payments).toEqual([]);
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
  });
  it.each([
    { livemode: false },
    { paid: false },
    { captured: false },
    { status: "pending" },
    { status: "failed" },
    { refunded: true },
    { amount_captured: 999 },
    { currency: "usd" },
    { amount: 0, amount_captured: 0 },
    { customer: null },
    { payment_intent: null },
    { created: Date.parse("2026-09-30T23:59:59Z") / 1000 },
    { created: Date.parse("2026-10-15T10:00:01Z") / 1000 },
  ])("excludes ineligible charge fields %j", async (change) => {
    const stripe = stripeProvider();
    stripe.charges.list.mockResolvedValue(page([{ ...charge, ...change }]));
    expect((await run(stripe)).payments).toEqual([]);
    expect(stripe.checkout.sessions.list).not.toHaveBeenCalled();
  });
  it.each([
    { livemode: false },
    { payment_status: "unpaid" },
    { status: "open" },
    { mode: "subscription" },
    { customer: "cus_other" },
    { payment_intent: "pi_other" },
    { currency: "usd" },
    { amount_total: 999 },
  ])("does not attribute a mismatched checkout %j", async (change) => {
    const stripe = stripeProvider();
    stripe.checkout.sessions.list.mockResolvedValue(
      page([{ ...session, ...change }]),
    );
    expect((await run(stripe)).payments).toEqual([]);
  });
  it.each([
    [
      line,
      {
        ...line,
        amount_total: 0,
        price: { ...line.price, product: "prod_other" },
      },
    ],
    [{ ...line, price: { ...line.price, product: "prod_other" } }],
    [{ ...line, currency: "usd" }],
    [{ ...line, amount_total: 500 }],
    [],
  ])(
    "refuses absent, mixed or mismatched product lines %j",
    async (...lines) => {
      const stripe = stripeProvider();
      stripe.checkout.sessions.listLineItems.mockResolvedValue(page(lines));
      expect((await run(stripe)).payments).toEqual([]);
    },
  );
  it("deduplicates a repeated payment without turning a customer into two payments", async () => {
    const stripe = stripeProvider();
    stripe.charges.list.mockResolvedValue(page([charge, charge]));
    const result = await run(stripe);
    expect(result.payments).toHaveLength(1);
    expect(stripe.charges.retrieve).toHaveBeenCalledTimes(1);
  });
  it("requires the agreed account identity before reading payments", async () => {
    const stripe = stripeProvider();
    stripe.accounts.retrieve.mockResolvedValue({ id: "acct_other" });
    const result = await run(stripe);
    expect(result.sources.stripe).toBe("error");
    expect(result.payments).toEqual([]);
    expect(stripe.charges.list).not.toHaveBeenCalled();
  });
  it("retains actual dispute/refund state for conservative domain reconciliation", async () => {
    const stripe = stripeProvider();
    stripe.charges.retrieve.mockResolvedValue({ ...charge, disputed: true });
    expect((await run(stripe)).payments[0]).toMatchObject({
      disputed: true,
      refundedMinor: 0,
    });
    stripe.charges.retrieve.mockResolvedValue({
      ...charge,
      amount_refunded: 500,
    });
    stripe.refunds.list.mockResolvedValue(
      page([{ id: "re_partial", status: "succeeded" }]),
    );
    expect((await run(stripe)).payments[0]).toMatchObject({
      disputed: false,
      refundedMinor: 500,
    });
  });
  it("excludes payments with an existing refund even if the charge flag lags", async () => {
    const stripe = stripeProvider();
    stripe.refunds.list.mockResolvedValue(
      page([{ id: "re_pending", status: "pending" }]),
    );
    expect((await run(stripe)).payments).toEqual([]);
  });
  it("never claims complete coverage for capped payment/session/line pages", async () => {
    const stripe = stripeProvider();
    stripe.charges.list.mockResolvedValue(page([charge], true));
    expect((await run(stripe)).sources.stripe).toBe("error");
    expect(stripe.charges.retrieve).not.toHaveBeenCalled();
    stripe.charges.list.mockResolvedValue(page([charge]));
    stripe.checkout.sessions.list.mockResolvedValue(page([session], true));
    expect((await run(stripe)).payments).toEqual([]);
    stripe.checkout.sessions.list.mockResolvedValue(page([session]));
    stripe.checkout.sessions.listLineItems.mockResolvedValue(
      page([line], true),
    );
    expect((await run(stripe)).payments).toEqual([]);
  });
  it("discards an incomplete refresh and never leaks SDK credential fragments", async () => {
    const stripe = stripeProvider();
    stripe.charges.retrieve.mockRejectedValue(
      new Error("sk_live_private credential"),
    );
    const result = await run(stripe);
    expect(result.sources.stripe).toBe("error");
    expect(result.payments).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("sk_live_private");
  });
  it("bounds a slow provider call and discards timed-out coverage", async () => {
    const stripe = stripeProvider();
    stripe.charges.retrieve.mockImplementation(() => new Promise(() => {}));
    const { task, project } = lifecycleFixture();
    const started = Date.now();
    const result = await observeIdeaLifecycle(task, project, outcome, {
      stripe,
      maximumDurationMs: 30,
      now: () => new Date(observedAt),
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.sources.stripe).toBe("error");
    expect(result.payments).toEqual([]);
    expect(result.limitations.join(" ")).toContain("deadline expired");
  });
});

const mergeSha = "b".repeat(40);
const pullRequest = {
  number: 42,
  head: { sha: headSha },
  base: { repo: { full_name: "CleanExpo/Unite-Group" }, ref: "main" },
  draft: false,
  state: "closed",
  merged: true,
  merge_commit_sha: mergeSha,
  merged_at: "2026-10-14T10:00:00Z",
  updated_at: "2026-10-14T10:00:00Z",
};
function githubProvider(
  override: (request: number) => unknown = () => pullRequest,
) {
  let reads = 0;
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    let body: unknown = [];
    if (url.pathname.endsWith("/pulls/42")) body = override(++reads);
    if (url.pathname.endsWith("/status"))
      body = { sha: headSha, total_count: 0, statuses: [] };
    if (url.pathname.endsWith("/check-runs"))
      body = { total_count: 0, check_runs: [] };
    return new Response(JSON.stringify(body));
  });
}
const runGithub = (
  fetchFn: typeof fetch,
  contract: CommercialOutcome = outcome,
) => {
  const { task, project } = approvedFixture(contract);
  return observeIdeaLifecycle(task, project, contract, {
    token: "private",
    fetchFn,
    deliveryAuthorityVerified: true,
    now: () => new Date(observedAt),
  });
};
function approvedFixture(contract: CommercialOutcome = outcome) {
  const fixture = lifecycleFixture(contract);
  const context = {
    actorId: "11111111-1111-4111-8111-111111111111",
    now: observedAt,
  };
  const initial = readIdeaLifecycle(fixture.task.metadata)!;
  let state = applyLifecycleCommand(
    initial,
    {
      action: "propose_brief",
      taskId: fixture.task.id,
      expectedRevision: initial.revision,
      brief: {
        objective: "Build the portal",
        user: "Customer",
        payer: "Customer",
        nonGoals: [],
        acceptanceCriteria: [
          {
            id: "AC1",
            criterion: "Customer gets value",
            validation: "Trusted live journey",
          },
        ],
        outputs: Array.from({ length: 13 }, (_, index) => ({
          id: index + 1,
          status: "deferred" as const,
          content: "Needs research",
        })),
        design: { summary: "Customer portal journey", sourceIds: [] },
        target: { repository: contract.repository, baseBranch: "main" },
        risks: [],
        openDecisions: [],
      },
    },
    context,
  );
  state = applyLifecycleCommand(
    state,
    {
      action: "approve_brief",
      taskId: fixture.task.id,
      expectedRevision: state.revision,
      briefHash: state.brief!.hash,
    },
    context,
  );
  fixture.task.metadata.lifecycle = state;
  fixture.delivery.sourceRefs = [
    {
      reference: `idea-brief:${state.brief!.hash}`,
      label: "Approved immutable idea brief",
    },
  ];
  return fixture;
}
describe("provider-confirmed main merge", () => {
  it("cannot attach an unrelated or unapproved delivery PR to the current idea", async () => {
    const { task, project, delivery } = approvedFixture();
    const fetchFn = githubProvider();
    const deps = { token: "private", fetchFn, now: () => new Date(observedAt) };
    expect(
      (await observeIdeaLifecycle(task, project, outcome, deps)).engineering,
    ).toBeUndefined();
    delivery.sourceRefs = [
      { reference: `idea-brief:${"f".repeat(64)}`, label: "Old brief" },
    ];
    expect(
      (
        await observeIdeaLifecycle(task, project, outcome, {
          ...deps,
          deliveryAuthorityVerified: true,
        })
      ).engineering,
    ).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("records the repository, main branch, head and merge commit without claiming live verification", async () => {
    const result = await runGithub(githubProvider());
    expect(result.engineering).toMatchObject({
      repository: outcome.repository,
      baseBranch: "main",
      headSha,
      mergeSha,
      merged: true,
      checksPassed: false,
      reviewApproved: false,
    });
    expect(result.sources.deployment).toBe("not_connected");
    expect(result.release).toBeUndefined();
  });
  it.each([
    { ...pullRequest, base: { ...pullRequest.base, ref: "feature" } },
    { ...pullRequest, merged: false },
    { ...pullRequest, draft: true },
    { ...pullRequest, merge_commit_sha: null },
    { ...pullRequest, merged_at: null },
    { ...pullRequest, merged_at: "2026-10-16T00:00:00Z" },
  ])("cannot prove a main merge with %j", async (pr) => {
    expect(
      (await runGithub(githubProvider(() => pr))).engineering?.merged,
    ).toBe(false);
  });
  it("rejects another provider repository and another agreed outcome repository", async () => {
    expect(
      (
        await runGithub(
          githubProvider(() => ({
            ...pullRequest,
            base: {
              ...pullRequest.base,
              repo: { full_name: "Other/Repo" },
            },
          })),
        )
      ).engineering,
    ).toBeUndefined();
    expect(
      (
        await runGithub(githubProvider(), {
          ...outcome,
          repository: "Other/Repo",
        })
      ).engineering,
    ).toBeUndefined();
  });
  it.each([
    { ...pullRequest, head: { sha: "f".repeat(40) } },
    { ...pullRequest, base: { ...pullRequest.base, ref: "feature" } },
    { ...pullRequest, merge_commit_sha: "f".repeat(40) },
    { ...pullRequest, merged_at: "2026-10-14T11:00:00Z" },
  ])(
    "discards a merge snapshot that changes between provider reads %j",
    async (changed) => {
      const result = await runGithub(
        githubProvider((read) => (read === 1 ? pullRequest : changed)),
      );
      expect(result.engineering).toBeUndefined();
      expect(result.sources.github).toBe("error");
    },
  );
});
