import { describe, expect, it, vi } from "vitest";
import {
  observeIdeaLifecycle,
  type StripeLifecycleReadClient,
} from "../idea-lifecycle-observations";
import {
  applyLifecycleCommand,
  createIdeaLifecycle,
  readIdeaLifecycle,
  toLifecycleView,
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

const productionIdentity = {
  projectId: "prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0",
  projectName: "unite-group",
  teamId: "team_KMZACI5rIltoCRhAtGCXlxUf",
  teamSlug: "unite-group",
  environment: "Production – unite-group",
};
const productionRoot = "https://api.github.com/repos/CleanExpo/Unite-Group";
const vercelCreator = { id: 35613825, login: "vercel[bot]", type: "Bot" };
const productionDeployment = {
  id: 301,
  sha: mergeSha,
  ref: mergeSha,
  repository_url: productionRoot,
  environment: productionIdentity.environment,
  production_environment: false,
  transient_environment: false,
  creator: vercelCreator,
  created_at: "2026-10-14T11:00:00Z",
  updated_at: "2026-10-14T11:01:00Z",
};
const productionStatus = {
  id: 401,
  state: "success",
  environment: productionIdentity.environment,
  environment_url: "https://unite-group-7tdb2e339-unite-group.vercel.app",
  deployment_url: `${productionRoot}/deployments/301`,
  repository_url: productionRoot,
  creator: vercelCreator,
  created_at: "2026-10-14T11:01:00Z",
  updated_at: "2026-10-14T11:01:00Z",
};
function productionProvider(
  deployments: unknown[] = [productionDeployment],
  statuses: unknown[] = [productionStatus],
  change?: (url: URL, read: number) => Response | undefined,
) {
  const fallback = gateProvider();
  const reads = new Map<string, number>();
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const read = (reads.get(url.href) ?? 0) + 1;
    reads.set(url.href, read);
    const changed = change?.(url, read);
    if (changed) return changed;
    if (
      url.pathname.endsWith("/deployments") &&
      url.searchParams.has("environment")
    ) {
      expect(url.searchParams.get("environment")).toBe(
        productionIdentity.environment,
      );
      return new Response(JSON.stringify(deployments));
    }
    if (url.pathname.endsWith("/deployments/301/statuses"))
      return new Response(JSON.stringify(statuses));
    return fallback(input, init);
  });
}
async function runProduction(
  provider = productionProvider(),
  duration?: number,
) {
  const fixture = approvedFixture();
  Object.assign(fixture.project, {
    production_url: "https://unite-group.in",
    production_deployment: productionIdentity,
  });
  const result = await observeIdeaLifecycle(
    fixture.task,
    fixture.project,
    outcome,
    {
      token: "private",
      fetchFn: provider,
      deliveryAuthorityVerified: true,
      now: () => new Date(observedAt),
      maximumDurationMs: duration,
    },
  );
  return { result, fixture };
}
describe("registered production merge deployment observations", () => {
  it("observes the merge SHA separately from the PR head without promoting journey, review or clients", async () => {
    const provider = productionProvider();
    const { result, fixture } = await runProduction(provider);
    expect(result.sources.deployment).toBe("connected");
    expect(result.deployment).toMatchObject({
      commitSha: mergeSha,
      deploymentId: 301,
      statusId: 401,
      environment: productionIdentity.environment,
      providerProductionEnvironment: false,
      currentServing: false,
      url: productionStatus.environment_url,
    });
    expect(result.release).toBeUndefined();
    expect(result.engineering?.headSha).toBe(headSha);
    expect(result.engineering?.reviewApproved).toBe(false);
    expect(result.activations).toEqual([]);
    const view = toLifecycleView(
      readIdeaLifecycle(fixture.task.metadata)!,
      result,
      observedAt,
    );
    expect(view.milestones.find((item) => item.id === "launch")).toMatchObject({
      status: "blocked",
      evidence: expect.arrayContaining([
        "github:deployment:301",
        "github:deployment-status:401",
        mergeSha,
      ]),
    });
    expect(view.commercial.status).not.toBe("achieved");
    expect(
      provider.mock.calls.every(([url]) =>
        String(url).startsWith(`${productionRoot}/`),
      ),
    ).toBe(true);
    expect(
      provider.mock.calls.filter(([url]) =>
        String(url).includes("environment="),
      ).length,
    ).toBe(4);
  });
  it.each([
    { sha: headSha },
    { repository_url: "https://api.github.com/repos/Other/Repo" },
    { creator: { ...vercelCreator, id: 1 } },
    { creator: { ...vercelCreator, login: "forged" } },
    { environment: "Preview – unite-group" },
    { transient_environment: true },
    { created_at: "2026-10-14T09:00:00Z" },
    { created_at: "2026-10-16T00:00:00Z" },
  ])("rejects a mismatched production deployment %j", async (change) => {
    const { result } = await runProduction(
      productionProvider([{ ...productionDeployment, ...change }]),
    );
    expect(result.deployment).toBeUndefined();
    expect(result.sources.deployment).toBe("error");
  });
  it.each([
    { state: "inactive" },
    { state: "failure" },
    { state: "pending" },
    { environment_url: "https://unite-group-7tdb2e339-other-team.vercel.app" },
    {
      environment_url:
        "https://unite-group-7tdb2e339-unite-group.vercel.app.evil.example",
    },
    {
      environment_url:
        "https://unite-group-7tdb2e339-unite-group.vercel.app?token=untrusted",
    },
    { environment_url: "http://unite-group-7tdb2e339-unite-group.vercel.app" },
    { environment_url: "https://user@unite-group.in" },
    { environment_url: "https://unite-group.in:444" },
    { creator: { ...vercelCreator, id: 1 } },
    { environment: "Preview – unite-group" },
    { deployment_url: `${productionRoot}/deployments/302` },
    { repository_url: "https://api.github.com/repos/Other/Repo" },
    { created_at: "2026-10-14T10:59:00Z" },
    { updated_at: "2026-10-16T00:00:00Z" },
  ])("rejects untrusted or unsuccessful latest status %j", async (change) => {
    const { result } = await runProduction(
      productionProvider(undefined, [{ ...productionStatus, ...change }]),
    );
    expect(result.deployment).toBeUndefined();
    expect(result.sources.deployment).toBe("error");
  });
  it("cannot hide a newer conflicting deployment or inactive status behind an older success", async () => {
    for (const provider of [
      productionProvider([
        productionDeployment,
        { ...productionDeployment, production_environment: true },
      ]),
      productionProvider(undefined, [
        productionStatus,
        { ...productionStatus, state: "failure" },
      ]),
      productionProvider([
        productionDeployment,
        { ...productionDeployment, id: 302, sha: headSha },
      ]),
      productionProvider(undefined, [
        productionStatus,
        { ...productionStatus, id: 402, state: "inactive" },
      ]),
    ])
      expect((await runProduction(provider)).result.deployment).toBeUndefined();
  });
  it("reads only the latest environment window when older history has many pages", async () => {
    const window = [
      productionDeployment,
      ...Array.from({ length: 9 }, (_, index) => ({
        ...productionDeployment,
        id: 300 - index,
        sha: headSha,
        created_at: "2026-10-13T11:00:00Z",
        updated_at: "2026-10-13T11:00:00Z",
      })),
    ];
    const provider = productionProvider(undefined, undefined, (url) => {
      if (
        url.pathname.endsWith("/deployments") &&
        url.searchParams.has("environment") &&
        !url.searchParams.has("sha")
      )
        return new Response(JSON.stringify(window), {
          headers: { link: '<https://untrusted.example/older>; rel="next"' },
        });
    });
    const { result } = await runProduction(provider);
    expect(result.deployment).toMatchObject({
      deploymentId: 301,
      coverage: "latest_environment_window",
      historicalCoverageComplete: false,
      environmentWindowSize: 10,
    });
    expect(
      provider.mock.calls.some(
        ([url]) =>
          String(url).includes("page=2") ||
          String(url).includes("untrusted.example"),
      ),
    ).toBe(false);
  });
  it.each(["order", "time", "newer", "changed"])(
    "rejects a conflicting or malformed latest window: %s",
    async (kind) => {
      const provider = productionProvider(undefined, undefined, (url, read) => {
        if (
          url.pathname.endsWith("/deployments") &&
          url.searchParams.has("environment") &&
          !url.searchParams.has("sha")
        ) {
          const other = {
            ...productionDeployment,
            id: kind === "order" ? 302 : 300,
            sha: headSha,
          };
          if (kind === "time") other.created_at = "2026-10-14T11:00:01Z";
          if (kind === "newer")
            return new Response(
              JSON.stringify([{ ...other, id: 302 }, productionDeployment]),
            );
          if (kind === "changed")
            return new Response(
              JSON.stringify(read > 1 ? [] : [productionDeployment]),
            );
          return new Response(JSON.stringify([productionDeployment, other]));
        }
      });
      const { result } = await runProduction(provider);
      expect(result.deployment).toBeUndefined();
      expect(result.sources.deployment).toBe("error");
    },
  );
  it("does not observe deployments without the signed current brief or a confirmed main merge", async () => {
    for (const authority of [false, true]) {
      const fixture = approvedFixture();
      Object.assign(fixture.project, {
        production_url: "https://unite-group.in",
        production_deployment: productionIdentity,
      });
      const fallback = productionProvider();
      const provider = vi.fn(
        async (input: string | URL | Request, init?: RequestInit) =>
          String(input).endsWith("/pulls/42")
            ? new Response(JSON.stringify({ ...pullRequest, merged: false }))
            : fallback(input, init),
      );
      const result = await observeIdeaLifecycle(
        fixture.task,
        fixture.project,
        outcome,
        {
          token: "private",
          fetchFn: provider,
          deliveryAuthorityVerified: authority,
          now: () => new Date(observedAt),
        },
      );
      expect(result.deployment).toBeUndefined();
      expect(
        provider.mock.calls.some(([input]) =>
          String(input).includes("environment="),
        ),
      ).toBe(false);
    }
  });
  it("fails closed on a hanging deployment provider within the shared deadline", async () => {
    const fallback = productionProvider();
    const provider = vi.fn(
      (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
        String(input).includes("environment=")
          ? new Promise(() => {})
          : fallback(input, init),
    );
    const started = Date.now();
    const { result } = await runProduction(provider, 100);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.deployment).toBeUndefined();
    expect(result.sources.deployment).toBe("error");
  });
  it.each(["deployment", "status", "pr", "pagination", "oversize"])(
    "rejects %s changes or incomplete coverage",
    async (kind) => {
      const provider = productionProvider(undefined, undefined, (url, read) => {
        if (
          url.pathname.endsWith("/deployments") &&
          url.searchParams.has("environment")
        ) {
          if (kind === "deployment" && read > 1)
            return new Response(JSON.stringify([]));
          if (kind === "pagination")
            return new Response(JSON.stringify([productionDeployment]), {
              headers: { link: '<https://untrusted.example>; rel="next"' },
            });
          if (kind === "oversize") return new Response(" ".repeat(2_000_001));
        }
        if (
          kind === "status" &&
          read > 1 &&
          url.pathname.endsWith("/301/statuses")
        )
          return new Response(
            JSON.stringify([{ ...productionStatus, state: "failure" }]),
          );
        if (kind === "pr" && read > 3 && url.pathname.endsWith("/pulls/42"))
          return new Response(
            JSON.stringify({ ...pullRequest, merge_commit_sha: headSha }),
          );
      });
      const { result } = await runProduction(provider);
      expect(result.deployment).toBeUndefined();
      expect(result.sources.deployment).toBe("error");
    },
  );
});
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

const requiredPolicy = {
  required_status_checks: {
    contexts: ["test", "nexus/release-receipt"],
    checks: [
      { context: "test", app_id: 15368 },
      { context: "nexus/release-receipt", app_id: null },
    ],
  },
  required_pull_request_reviews: null,
};
const gateCheck = {
  id: 11,
  name: "test",
  head_sha: headSha,
  status: "completed",
  conclusion: "success",
  details_url:
    "https://github.com/CleanExpo/Unite-Group/actions/runs/101/job/11",
  app: { id: 15368, slug: "github-actions" },
  check_suite: { id: 201 },
};
const gateStatus = {
  sha: headSha,
  total_count: 1,
  statuses: [{ id: 10, context: "nexus/release-receipt", state: "success" }],
};
const actionRun = {
  id: 101,
  run_attempt: 1,
  check_suite_id: 201,
  head_sha: headSha,
  path: ".github/workflows/ci.yml",
  event: "pull_request",
  status: "completed",
  conclusion: "success",
  repository: { full_name: "CleanExpo/Unite-Group" },
};
const actionJob = {
  id: 11,
  run_id: 101,
  run_attempt: 1,
  head_sha: headSha,
  name: "test",
  status: "completed",
  conclusion: "success",
  check_run_url:
    "https://api.github.com/repos/CleanExpo/Unite-Group/check-runs/11",
};
function gateProvider(
  overrides: Partial<
    Record<"policy" | "rules" | "checks" | "statuses" | "run" | "job", unknown>
  > = {},
  change?: (url: URL, policyRead: number) => Response | undefined,
) {
  const fallback = githubProvider();
  let policyReads = 0;
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/protection")) policyReads++;
    const changed = change?.(url, policyReads);
    if (changed) return changed;
    const values = {
      policy: requiredPolicy,
      rules: [],
      checks: { total_count: 1, check_runs: [gateCheck] },
      statuses: gateStatus,
      run: actionRun,
      job: actionJob,
      ...overrides,
    };
    let body: unknown;
    if (url.pathname.endsWith("/protection")) body = values.policy;
    else if (url.pathname.endsWith("/rules/branches/main")) body = values.rules;
    else if (url.pathname.endsWith("/check-runs")) body = values.checks;
    else if (url.pathname.endsWith("/status")) body = values.statuses;
    else if (url.pathname.endsWith("/actions/runs/101")) body = values.run;
    else if (url.pathname.endsWith("/actions/jobs/11")) body = values.job;
    else return fallback(input);
    expect(init?.redirect).toBe("error");
    return new Response(JSON.stringify(body));
  });
}
describe("authoritative required check policy and provenance", () => {
  it.each(["failure", "skipped", "neutral"])(
    "cannot hide a %s required check behind a same-context success status",
    async (conclusion) => {
      const policy = {
        ...requiredPolicy,
        required_status_checks: {
          contexts: ["test"],
          checks: [{ context: "test", app_id: null }],
        },
      };
      const checks = {
        total_count: 1,
        check_runs: [{ ...gateCheck, conclusion }],
      };
      const statuses = {
        ...gateStatus,
        total_count: 1,
        statuses: [{ id: 12, context: "test", state: "success" }],
      };
      expect(
        (await runGithub(gateProvider({ policy, checks, statuses })))
          .engineering?.checksPassed,
      ).toBe(false);
    },
  );
  it.each([null, -1, 15368])(
    "cannot hide a failed same-context status behind a green check (app %s)",
    async (app_id) => {
      const policy = {
        ...requiredPolicy,
        required_status_checks: {
          contexts: ["test"],
          checks: [{ context: "test", app_id }],
        },
      };
      const statuses = {
        ...gateStatus,
        total_count: 1,
        statuses: [{ id: 12, context: "test", state: "failure" }],
      };
      expect(
        (await runGithub(gateProvider({ policy, statuses }))).engineering
          ?.checksPassed,
      ).toBe(false);
    },
  );
  it.each([
    { ...gateCheck, app: { id: 15368, slug: "forged" } },
    {
      ...gateCheck,
      details_url:
        "https://untrusted.example/CleanExpo/Unite-Group/actions/runs/101/job/11",
    },
    {
      ...gateCheck,
      details_url: "https://github.com/Other/Repo/actions/runs/101/job/11",
    },
    { ...gateCheck, details_url: `${gateCheck.details_url}?token=untrusted` },
  ])(
    "rejects spoofed app identity or action URLs without following them",
    async (check) => {
      const provider = gateProvider({
        checks: { total_count: 1, check_runs: [check] },
      });
      expect((await runGithub(provider)).engineering?.checksPassed).toBe(false);
      expect(
        provider.mock.calls.every(([input]) =>
          String(input).startsWith(
            "https://api.github.com/repos/CleanExpo/Unite-Group/",
          ),
        ),
      ).toBe(true);
    },
  );
  it("bounds an unresponsive policy provider without claiming a passing check gate", async () => {
    const fallback = gateProvider();
    const provider = vi.fn(
      (
        input: string | URL | Request,
        init?: RequestInit,
      ): Promise<Response> => {
        if (String(input).endsWith("/protection")) return new Promise(() => {});
        return fallback(input, init);
      },
    );
    const { task, project } = approvedFixture();
    const started = Date.now();
    const result = await observeIdeaLifecycle(task, project, outcome, {
      token: "private",
      fetchFn: provider,
      deliveryAuthorityVerified: true,
      maximumDurationMs: 30,
      now: () => new Date(observedAt),
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.engineering?.checksPassed).toBe(false);
  });
  it("accepts complete exact-SHA required app jobs and required statuses while leaving missing independent review unverified", async () => {
    const provider = gateProvider();
    const result = await runGithub(provider);
    expect(result.engineering).toMatchObject({
      merged: true,
      checksPassed: true,
      reviewApproved: false,
    });
    expect(
      provider.mock.calls.some(([input]) =>
        String(input).endsWith("/actions/jobs/11"),
      ),
    ).toBe(true);
    expect(
      provider.mock.calls.filter(([input]) =>
        String(input).endsWith("/protection"),
      ),
    ).toHaveLength(2);
  });
  it.each([
    { status: "in_progress", conclusion: null },
    { status: "completed", conclusion: "failure" },
  ])(
    "does not invent a gate from unrelated workflow aggregate state %j",
    async (aggregate) => {
      expect(
        (await runGithub(gateProvider({ run: { ...actionRun, ...aggregate } })))
          .engineering?.checksPassed,
      ).toBe(true);
    },
  );
  it.each([
    {
      checks: {
        total_count: 1,
        check_runs: [
          { ...gateCheck, app: { id: 999, slug: "github-actions" } },
        ],
      },
    },
    {
      checks: {
        total_count: 1,
        check_runs: [{ ...gateCheck, status: "in_progress" }],
      },
    },
    {
      checks: {
        total_count: 1,
        check_runs: [{ ...gateCheck, conclusion: "skipped" }],
      },
    },
    {
      checks: {
        total_count: 1,
        check_runs: [{ ...gateCheck, conclusion: "neutral" }],
      },
    },
    { checks: { total_count: 2, check_runs: [gateCheck] } },
    { statuses: { ...gateStatus, statuses: [] } },
    { statuses: { ...gateStatus, sha: "f".repeat(40) } },
    {
      statuses: {
        ...gateStatus,
        statuses: [{ ...gateStatus.statuses[0], state: "failure" }],
      },
    },
    {
      statuses: {
        ...gateStatus,
        statuses: [{ id: 10, context: "CodeRabbit", state: "success" }],
      },
    },
    { job: { ...actionJob, run_attempt: 2 } },
    { job: { ...actionJob, run_id: 102 } },
    { job: { ...actionJob, head_sha: "f".repeat(40) } },
    { job: { ...actionJob, name: "advisory" } },
    {
      job: {
        ...actionJob,
        check_run_url: "https://api.github.com/repos/Other/Repo/check-runs/11",
      },
    },
    { run: { ...actionRun, check_suite_id: 202 } },
    { run: { ...actionRun, head_sha: "f".repeat(40) } },
    { run: { ...actionRun, repository: { full_name: "Other/Repo" } } },
    { run: { ...actionRun, event: "pull_request_target" } },
    { run: { ...actionRun, path: ".github/workflows/advisory.yml" } },
    {
      policy: {
        required_status_checks: null,
        required_pull_request_reviews: null,
      },
    },
    { policy: {} },
  ])(
    "refuses missing, skipped, advisory or mismatched required proof %j",
    async (change) => {
      expect(
        (await runGithub(gateProvider(change))).engineering?.checksPassed,
      ).toBe(false);
    },
  );
  it("includes every active ruleset-required status and refuses unsupported required CI rules", async () => {
    const rules = [
      {
        type: "required_status_checks",
        parameters: {
          required_status_checks: [
            { context: "security", integration_id: 15368 },
          ],
        },
      },
    ];
    expect(
      (await runGithub(gateProvider({ rules }))).engineering?.checksPassed,
    ).toBe(false);
    expect(
      (
        await runGithub(
          gateProvider({ rules: [{ type: "workflows", parameters: {} }] }),
        )
      ).engineering?.checksPassed,
    ).toBe(false);
    expect(
      (
        await runGithub(
          gateProvider({ rules: [{ type: "required_signatures" }] }),
        )
      ).engineering?.checksPassed,
    ).toBe(true);
  });
  it.each(["check-runs", "status", "actions/runs/101"])(
    "discards %s evidence that changes during observation",
    async (suffix) => {
      const provider = gateProvider({}, (url, reads) => {
        if (reads !== 2 || !url.pathname.endsWith(`/${suffix}`))
          return undefined;
        const body =
          suffix === "check-runs"
            ? {
                total_count: 1,
                check_runs: [{ ...gateCheck, conclusion: "failure" }],
              }
            : suffix === "status"
              ? {
                  ...gateStatus,
                  statuses: [{ ...gateStatus.statuses[0], state: "pending" }],
                }
              : { ...actionRun, run_attempt: 2 };
        return new Response(JSON.stringify(body));
      });
      expect((await runGithub(provider)).engineering).toBeUndefined();
    },
  );
  it("rejects policy drift and a PR that moves during policy observation", async () => {
    const changedPolicy = gateProvider({}, (url, reads) =>
      url.pathname.endsWith("/protection") && reads === 2
        ? new Response(
            JSON.stringify({ ...requiredPolicy, required_status_checks: null }),
          )
        : undefined,
    );
    expect((await runGithub(changedPolicy)).engineering).toBeUndefined();
    const movedPr = gateProvider({}, (url, reads) =>
      url.pathname.endsWith("/pulls/42") && reads === 2
        ? new Response(
            JSON.stringify({ ...pullRequest, head: { sha: "f".repeat(40) } }),
          )
        : undefined,
    );
    expect((await runGithub(movedPr)).engineering).toBeUndefined();
  });
  it("refuses paginated or inaccessible policy without following supplied URLs", async () => {
    for (const response of [
      new Response("denied", { status: 403 }),
      new Response(JSON.stringify(requiredPolicy), {
        headers: { link: '<https://untrusted.example/policy>; rel="next"' },
      }),
    ]) {
      const provider = gateProvider({}, (url) =>
        url.pathname.endsWith("/protection") ? response.clone() : undefined,
      );
      expect((await runGithub(provider)).engineering?.checksPassed).toBe(false);
      expect(
        provider.mock.calls.every(([input]) =>
          String(input).startsWith(
            "https://api.github.com/repos/CleanExpo/Unite-Group/",
          ),
        ),
      ).toBe(true);
    }
  });
});
