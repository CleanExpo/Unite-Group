import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  projectEnrolledIdeaEvidence,
  type EnrolledIdeaEvidence,
} from "../idea-enrolled-observations";
import {
  applyLifecycleCommand,
  createIdeaLifecycle,
  readIdeaLifecycle,
  type CommercialOutcome,
  type LifecycleObservations,
} from "../idea-lifecycle";
import {
  canonicalEvidenceJson,
  hashIdeaEvidence,
  ideaEvidenceSignatureMessage,
  type IdeaEvidenceEnvelope,
  type IdeaEvidenceGrant,
  type IdeaEvidenceSourceRegistration,
} from "../idea-evidence-contracts";
import { canonicalHash } from "../portfolio-control-plane";
import { observationFixture, headSha } from "./delivery-observations.fixture";
import { observeIdeaLifecycle } from "../idea-lifecycle-observations";
import * as tasks from "../tasks";
import type { CommandCentreTask } from "../tasks";
import * as service from "@/lib/supabase/service";

const now = "2026-10-16T00:00:00.000Z";
const occurred = "2026-10-15T23:59:00.000Z";
const founder = "11111111-1111-4111-8111-111111111111";
const merge = "b".repeat(40);
const digest = "c".repeat(64);
const keys = generateKeyPairSync("ed25519");
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

function fixture(
  commercial: CommercialOutcome | null = outcome,
  taskId?: string,
) {
  vi.stubEnv("IDEA_EVIDENCE_ENABLED", "1");
  const { task, project } = observationFixture();
  if (taskId) task.id = taskId;
  task.founder_id = founder;
  Object.assign(project, {
    production_url: "https://unite-group.in",
    production_deployment: {
      projectId: "prj_factory",
      teamId: "team_factory",
      projectName: "factory",
      teamSlug: "factory",
      environment: "Production",
    },
  });
  const context = { actorId: founder, now };
  let state = {
    ...createIdeaLifecycle(
      {
        title: "Factory",
        rawIdea: taskId
          ? `Research acceptance for ${taskId}`
          : "Research an idea",
        requestId: "22222222-2222-4222-8222-222222222222",
      },
      context,
    ),
    outcome: commercial,
  };
  state = applyLifecycleCommand(
    state,
    {
      action: "propose_brief",
      taskId: task.id,
      expectedRevision: state.revision,
      brief: {
        objective: "Research ideas",
        user: "Founder",
        payer: "Internal budget",
        nonGoals: [],
        acceptanceCriteria: [
          { id: "AC1", criterion: "Persist handoff", validation: "Read back" },
        ],
        outputs: Array.from({ length: 13 }, (_, i) => ({
          id: i + 1,
          status: "deferred" as const,
          content: "Research required",
        })),
        design: { summary: "Founder journey", sourceIds: [] },
        target: { repository: outcome.repository, baseBranch: "main" },
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
      taskId: task.id,
      expectedRevision: state.revision,
      briefHash: state.brief!.hash,
    },
    context,
  );
  task.metadata.lifecycle = state;
  const observations: LifecycleObservations = {
    observedAt: now,
    lifecycleRevision: state.revision,
    briefHash: state.brief!.hash,
    outcomeHash: commercial ? canonicalHash(commercial) : null,
    sources: {
      github: "connected",
      stripe: "not_connected",
      activation: "not_connected",
      deployment: "not_connected",
    },
    engineering: {
      repository: outcome.repository,
      baseBranch: "main",
      headSha,
      mergeSha: merge,
      prUrl: "https://github.com/CleanExpo/Unite-Group/pull/42",
      merged: true,
      checksPassed: true,
      reviewApproved: false,
    },
    activations: [],
    payments: [],
    limitations: [],
  };
  const common = {
    founder_id: founder,
    task_id: task.id,
    lifecycle_revision: state.revision,
    brief_hash: state.brief!.hash,
    outcome_hash: observations.outcomeHash,
    repository: outcome.repository,
    product_id: outcome.productId,
    environment: "production" as const,
    contract_hash: digest,
  };
  const binding = {
    account_id: outcome.stripeAccountId,
    customer_id: "cus_buyer",
    product_id: outcome.productId,
    verified_at: "2026-10-15T23:00:00Z",
    association_ref: "billing:order1",
    association_digest: digest,
  };
  const events: IdeaEvidenceEnvelope[] = [
    {
      ...common,
      source_id: "review",
      source_version: 1,
      grant_id: "33333333-3333-4333-8333-333333333333",
      grant_version: 1,
      event_id: "review1",
      event_kind: "independent_review_verified",
      release_id: headSha,
      subject: { namespace: "repository", id: outcome.repository },
      event_name: "independent_review",
      occurred_at: occurred,
      payload: {
        adapter_version: "nexus_release_gate_v1",
        pull_request: 42,
        base_sha: "d".repeat(40),
        head_sha: headSha,
        receipt_digest: digest,
        report_digest: digest,
        mirror_digest: digest,
        execution_provenance_digest: digest,
        verifier_digest: digest,
        verifier_version: "gate_v1",
        collector_policy_digest: digest,
        validation: "validated_non_exempt",
        reviewer: {
          vendor: "minimax",
          model: "MiniMax-M3",
          session_id: "review-session1",
        },
      },
    },
    {
      ...common,
      source_id: "journey",
      source_version: 1,
      grant_id: "44444444-4444-4444-8444-444444444444",
      grant_version: 1,
      event_id: "journey1",
      event_kind: "production_journey_verified",
      release_id: "dpl_factory",
      subject: { namespace: "founder", id: founder },
      event_name: "factory_journey",
      occurred_at: occurred,
      payload: {
        adapter_version: "canonical_factory_journey_v1",
        canonical_origin: "https://unite-group.in",
        provider_project_id: "prj_factory",
        provider_team_id: "team_factory",
        deployment_id: "dpl_factory",
        merge_sha: merge,
        journey_version: "factory_manual_research_v1",
        authenticated_subject: { namespace: "founder", id: founder },
        steps: [
          "intake_persisted",
          "research_recorded",
          "brief_approved",
          "handoff_persisted",
          "recovery_readback",
        ].map((action, index) => ({
          sequence: index + 1,
          action,
          action_ref: `action:${index}`,
          action_digest: digest,
          readback_ref: `read:${index}`,
          readback_digest: digest,
        })),
        recovery_ref: "recovery1",
        recovery_digest: digest,
        alias_start: {
          deployment_id: "dpl_factory",
          merge_sha: merge,
          observed_at: "2026-10-15T23:58:00Z",
        },
        alias_end: {
          deployment_id: "dpl_factory",
          merge_sha: merge,
          observed_at: occurred,
        },
      },
    },
    {
      ...common,
      source_id: "value",
      source_version: 1,
      grant_id: "55555555-5555-4555-8555-555555555555",
      grant_version: 1,
      event_id: "value1",
      event_kind: "customer_value_achieved",
      release_id: "dpl_factory",
      subject: { namespace: "stripe_customer", id: "cus_buyer" },
      event_name: outcome.activationEvent,
      occurred_at: occurred,
      payload: {
        adapter_version: "product_value_action_v1",
        action_name: outcome.activationEvent,
        durable_action_ref: "order:fulfilled1",
        durable_action_digest: digest,
        readback_ref: "order:read1",
        readback_digest: digest,
        stripe_binding: binding,
      },
    },
  ];
  const seal = (event: IdeaEvidenceEnvelope): EnrolledIdeaEvidence => {
    const registration: IdeaEvidenceSourceRegistration = {
      source_id: event.source_id,
      version: 1,
      kind: "ed25519",
      event_kind: event.event_kind,
      adapter_version: event.payload.adapter_version,
      repository: event.repository,
      product_id: event.product_id,
      environment: event.environment,
      public_key: keys.publicKey
        .export({ format: "pem", type: "spki" })
        .toString(),
      ...(event.event_kind === "independent_review_verified"
        ? {
            review_policy: {
              verifier_digest: digest,
              collector_policy_digest: digest,
              implementer_vendor: "openai",
            },
          }
        : {}),
    };
    const grant: IdeaEvidenceGrant = {
      ...event,
      grant_id: event.grant_id,
      version: 1,
      valid_from: "2026-10-01T00:00:00Z",
      valid_until: "2026-10-31T00:00:00Z",
      outcome_canonical: commercial
        ? JSON.stringify(commercial, Object.keys(commercial).sort())
        : "null",
      ...(event.event_kind === "customer_value_achieved"
        ? { stripe_binding: binding }
        : {}),
    };
    // Grant schema shares only these explicit scope fields with an envelope.
    for (const key of [
      "event_kind",
      "event_id",
      "grant_version",
      "payload",
      "occurred_at",
    ] as const)
      delete (grant as unknown as Record<string, unknown>)[key];
    return {
      source: {
        registration,
        registration_hash: hashIdeaEvidence(registration),
      },
      grant: {
        registration: grant,
        registration_hash: hashIdeaEvidence(grant),
      },
      record: {
        id: event.grant_id,
        source_id: event.source_id,
        source_version: 1,
        event_id: event.event_id,
        grant_id: event.grant_id,
        grant_version: 1,
        founder_id: event.founder_id,
        task_id: event.task_id,
        record_kind: "evidence",
        withdrawal_of: null,
        envelope: event,
        canonical_envelope: canonicalEvidenceJson(event),
        payload_hash: hashIdeaEvidence(event),
        signature: sign(
          null,
          ideaEvidenceSignatureMessage(event),
          keys.privateKey,
        ).toString("base64"),
        occurred_at: event.occurred_at,
        admitted_at: "2026-10-15T23:59:30Z",
      },
    };
  };
  const run = (records = events.map(seal)) =>
    projectEnrolledIdeaEvidence(task, project, commercial, observations, {
      loadEvidence: async () => records,
    });
  return { task, project, observations, events, seal, run };
}
function acceptanceFixture() {
  const primary = fixture(null);
  const secondary = fixture(null, "66666666-6666-4666-8666-666666666666");
  secondary.task.project_key = null;
  // Acceptance never acquires the implementation task's registered PR.
  delete secondary.task.metadata.delivery;
  const lifecycle = readIdeaLifecycle(secondary.task.metadata)!;
  const binding = {
    task_id: secondary.task.id,
    lifecycle_revision: lifecycle.revision,
    brief_hash: lifecycle.brief!.hash,
    outcome_hash: null,
  } as const;
  const event = primary.events[1];
  if (event.event_kind !== "production_journey_verified")
    throw new Error("fixture");
  event.payload.acceptance_task = { ...binding };
  const records = () => {
    const rows = primary.events.slice(0, 2).map(primary.seal);
    const grant = rows[1].grant.registration as IdeaEvidenceGrant;
    grant.acceptance_task = { ...binding };
    rows[1].grant.registration_hash = hashIdeaEvidence(grant);
    return rows;
  };
  const loadAcceptanceTask = vi.fn(
    async (
      _founderId: string,
      _taskId: string,
    ): Promise<CommandCentreTask | null> => secondary.task,
  );
  const run = (rows = records()) =>
    projectEnrolledIdeaEvidence(
      primary.task,
      primary.project,
      null,
      primary.observations,
      { loadEvidence: async () => rows, loadAcceptanceTask },
    );
  return {
    primary,
    secondary,
    binding,
    event,
    records,
    loadAcceptanceTask,
    run,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("enrolled lifecycle projection", () => {
  it("proves the primary release using an explicitly enrolled fresh acceptance task without lending it engineering", async () => {
    const f = acceptanceFixture();
    const secondaryBefore = structuredClone({
      task: f.secondary.task,
      observations: f.secondary.observations,
    });
    const deliveryBefore = structuredClone(f.primary.task.metadata.delivery);
    await f.run();
    expect(f.loadAcceptanceTask).toHaveBeenCalledExactlyOnceWith(
      founder,
      f.secondary.task.id,
    );
    expect(f.primary.observations).toMatchObject({
      engineering: { reviewApproved: true },
      release: { commitSha: merge, journeyPassed: true },
      activations: [],
    });
    expect({
      task: f.secondary.task,
      observations: f.secondary.observations,
    }).toEqual(secondaryBefore);
    expect(f.primary.task.metadata.delivery).toEqual(deliveryBefore);
  });
  it.each([
    "deleted",
    "other_id",
    "other_owner",
    "other_project",
    "target_repository",
    "target_branch",
    "brief",
    "revision",
    "outcome",
    "unapproved",
    "other_approver",
    "database_error",
  ])("rejects current acceptance task %s", async (kind) => {
    const f = acceptanceFixture();
    if (kind === "deleted") f.loadAcceptanceTask.mockResolvedValue(null);
    if (kind === "other_id") f.secondary.task.id = f.primary.task.id;
    if (kind === "other_owner")
      f.secondary.task.founder_id = "99999999-9999-4999-8999-999999999999";
    if (kind === "other_project") f.secondary.task.project_key = "Other";
    const lifecycle = f.secondary.task.metadata.lifecycle as Record<
      string,
      unknown
    >;
    if (["target_repository", "brief", "revision", "outcome"].includes(kind)) {
      let current = readIdeaLifecycle(f.secondary.task.metadata)!;
      const brief = current.brief!.snapshot.brief;
      const context = { actorId: founder, now };
      if (kind === "outcome")
        current = applyLifecycleCommand(
          current,
          {
            action: "set_outcome",
            taskId: f.secondary.task.id,
            expectedRevision: current.revision,
            outcome,
          },
          context,
        );
      const proposed = applyLifecycleCommand(
        current,
        {
          action: "propose_brief",
          taskId: f.secondary.task.id,
          expectedRevision: current.revision,
          brief: {
            ...brief,
            objective: "Freshly approved acceptance scope",
            target: {
              repository:
                kind === "target_repository"
                  ? "Other/Repo"
                  : outcome.repository,
              baseBranch: "main",
            },
          },
        },
        context,
      );
      const approved = applyLifecycleCommand(
        proposed,
        {
          action: "approve_brief",
          taskId: f.secondary.task.id,
          expectedRevision: proposed.revision,
          briefHash: proposed.brief!.hash,
        },
        context,
      );
      f.secondary.task.metadata.lifecycle = approved;
      expect(readIdeaLifecycle(f.secondary.task.metadata)).not.toBeNull();
      Object.assign(f.binding, {
        lifecycle_revision:
          kind === "revision"
            ? f.binding.lifecycle_revision
            : approved.revision,
        brief_hash:
          kind === "brief" ? f.binding.brief_hash : approved.brief!.hash,
      });
      f.event.payload.acceptance_task = { ...f.binding };
    }
    if (kind === "target_branch") {
      const brief = lifecycle.brief as {
        snapshot: { brief: { target: { baseBranch: string } } };
      };
      brief.snapshot.brief.target.baseBranch = "develop";
    }
    if (kind === "unapproved") lifecycle.approval = null;
    if (kind === "other_approver")
      (lifecycle.approval as Record<string, unknown>).actorId =
        "99999999-9999-4999-8999-999999999999";
    if (kind === "database_error")
      f.loadAcceptanceTask.mockRejectedValue(new Error("read failed"));
    await f.run();
    expect(f.primary.observations.release).toBeUndefined();
    expect(f.primary.observations.activations).toEqual([]);
  });
  it("also accepts a current acceptance task assigned to the exact primary project", async () => {
    const f = acceptanceFixture();
    f.secondary.task.project_key = f.primary.task.project_key;
    await f.run();
    expect(f.primary.observations.release?.journeyPassed).toBe(true);
  });
  it.each(["grant", "payload", "missing_grant", "missing_payload"])(
    "rejects acceptance binding %s substitution",
    async (kind) => {
      const f = acceptanceFixture();
      if (kind === "payload")
        f.event.payload.acceptance_task!.brief_hash = digest;
      if (kind === "missing_payload") delete f.event.payload.acceptance_task;
      const rows = f.records();
      const grant = rows[1].grant.registration as IdeaEvidenceGrant;
      if (kind === "grant") grant.acceptance_task!.brief_hash = digest;
      if (kind === "missing_grant") delete grant.acceptance_task;
      rows[1].grant.registration_hash = hashIdeaEvidence(grant);
      await f.run(rows);
      expect(f.primary.observations.release).toBeUndefined();
    },
  );
  it("does not borrow the acceptance task's PR when the primary has none", async () => {
    const f = acceptanceFixture();
    f.secondary.task.metadata.delivery = f.primary.task.metadata.delivery;
    delete f.primary.task.metadata.delivery;
    await f.run();
    expect(f.primary.observations.release).toBeUndefined();
    expect(f.primary.observations.engineering?.reviewApproved).toBe(false);
  });
  it("caches repeated acceptance IDs within the same bounded projection", async () => {
    const f = acceptanceFixture();
    const rows = f.records();
    await f.run([...rows, rows[1], rows[1]]);
    expect(f.loadAcceptanceTask).toHaveBeenCalledTimes(1);
    expect(f.primary.observations.release?.journeyPassed).toBe(true);
  });
  it("keeps legacy same-task journeys independent of acceptance task reads", async () => {
    const f = fixture(null);
    const loadAcceptanceTask = vi.fn();
    await projectEnrolledIdeaEvidence(f.task, f.project, null, f.observations, {
      loadEvidence: async () => f.events.slice(0, 2).map(f.seal),
      loadAcceptanceTask,
    });
    expect(f.observations.release?.journeyPassed).toBe(true);
    expect(loadAcceptanceTask).not.toHaveBeenCalled();
  });
  it("includes acceptance readback in the original eight-second deadline and never applies a late result", async () => {
    vi.useFakeTimers();
    const f = acceptanceFixture();
    let finish!: (task: typeof f.secondary.task) => void;
    f.loadAcceptanceTask.mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const projecting = f.run();
    await vi.advanceTimersByTimeAsync(8_000);
    await projecting;
    expect(f.primary.observations).toMatchObject({
      release: undefined,
      engineering: { reviewApproved: false },
      sources: { deployment: "error", activation: "error" },
    });
    finish(f.secondary.task);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.primary.observations.release).toBeUndefined();
  });
  it("does not renew the read deadline after loading enrollment records", async () => {
    vi.useFakeTimers();
    const f = acceptanceFixture();
    f.loadAcceptanceTask.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(f.secondary.task), 200),
        ),
    );
    const projecting = projectEnrolledIdeaEvidence(
      f.primary.task,
      f.primary.project,
      null,
      f.primary.observations,
      {
        loadEvidence: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(f.records()), 7_900),
          ),
        loadAcceptanceTask: f.loadAcceptanceTask,
      },
    );
    await vi.advanceTimersByTimeAsync(8_000);
    await projecting;
    expect(f.loadAcceptanceTask).toHaveBeenCalledTimes(1);
    expect(f.primary.observations.sources.deployment).toBe("error");
    await vi.advanceTimersByTimeAsync(200);
    expect(f.primary.observations.release).toBeUndefined();
  });
  it("bounds concurrent current-task reads and stops queued reads on expiry", async () => {
    vi.useFakeTimers();
    const f = acceptanceFixture();
    const rows = [f.records()[0]];
    for (let index = 0; index < 6; index++) {
      const event = structuredClone(f.event);
      event.event_id = `journey${index}`;
      event.grant_id = `77777777-7777-4777-8777-77777777777${index}`;
      event.payload.acceptance_task!.task_id = `88888888-8888-4888-8888-88888888888${index}`;
      const row = f.primary.seal(event);
      const grant = row.grant.registration as IdeaEvidenceGrant;
      grant.acceptance_task = event.payload.acceptance_task;
      row.grant.registration_hash = hashIdeaEvidence(grant);
      rows.push(row);
    }
    const complete: (() => void)[] = [];
    f.loadAcceptanceTask.mockImplementation(
      (_founderId, taskId) =>
        new Promise((resolve) =>
          complete.push(() => resolve({ ...f.secondary.task, id: taskId })),
        ),
    );
    const projecting = f.run(rows);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.loadAcceptanceTask).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(7_999);
    await projecting;
    complete.forEach((finish) => finish());
    await vi.advanceTimersByTimeAsync(1);
    expect(f.loadAcceptanceTask).toHaveBeenCalledTimes(4);
    expect(f.primary.observations.release).toBeUndefined();
  });
  it("preserves the authoritative 500-row limit before starting acceptance reads", async () => {
    const f = acceptanceFixture();
    const row = f.records()[1];
    await f.run(Array.from({ length: 501 }, () => row));
    expect(f.loadAcceptanceTask).not.toHaveBeenCalled();
    expect(f.primary.observations.release).toBeUndefined();
    expect(f.primary.observations.sources.deployment).toBe("error");
  });
  it("uses a founder-scoped explicit service client outside the secondary test seam", async () => {
    const f = acceptanceFixture();
    const client = {} as ReturnType<typeof service.createServiceClient>;
    vi.spyOn(service, "createServiceClient").mockReturnValue(client);
    const getTask = vi
      .spyOn(tasks, "getTaskById")
      .mockResolvedValue(f.secondary.task);
    await projectEnrolledIdeaEvidence(
      f.primary.task,
      f.primary.project,
      null,
      f.primary.observations,
      { loadEvidence: async () => f.records() },
    );
    expect(getTask).toHaveBeenCalledExactlyOnceWith(
      { founderId: founder, taskId: f.binding.task_id },
      client,
    );
    expect(f.primary.observations.release?.journeyPassed).toBe(true);
  });
  it("projects the authenticated exact-head review, canonical journey and bound external value action", async () => {
    const f = fixture();
    await f.run();
    expect(f.observations).toMatchObject({
      observedAt: occurred,
      engineering: { reviewApproved: true, checksPassed: true },
      sources: {
        activation: "connected",
        deployment: "connected",
        stripe: "not_connected",
      },
      release: {
        commitSha: merge,
        releaseId: "dpl_factory",
        url: "https://unite-group.in",
        live: true,
        journeyPassed: true,
      },
      activations: [
        {
          customerId: "cus_buyer",
          productId: outcome.productId,
          event: outcome.activationEvent,
          releaseId: "dpl_factory",
          occurredAt: occurred,
        },
      ],
      payments: [],
    });
  });
  it("requires explicit enablement and leaves existing observations unchanged by default", async () => {
    const f = fixture();
    vi.stubEnv("IDEA_EVIDENCE_ENABLED", "0");
    const before = structuredClone(f.observations);
    await f.run();
    expect(f.observations).toEqual(before);
  });
  it("keeps failed CI failed when an independent review passes", async () => {
    const f = fixture();
    f.observations.engineering!.checksPassed = false;
    await f.run();
    expect(f.observations.engineering).toMatchObject({
      reviewApproved: true,
      checksPassed: false,
    });
  });
  it("projects internal engineering without inventing a commercial contract", async () => {
    const f = fixture(null);
    await f.run(f.events.slice(0, 2).map(f.seal));
    expect(f.observations).toMatchObject({
      engineering: { reviewApproved: true },
      release: { journeyPassed: true },
      sources: { activation: "not_connected" },
      activations: [],
    });
  });
  it.each([
    "owner",
    "task",
    "revision",
    "brief",
    "outcome",
    "repository",
    "withdrawn",
    "signature",
    "admitted_future",
    "admitted_invalid",
  ])("rejects transplanted or invalid %s evidence", async (kind) => {
    const f = fixture();
    const records = f.events.map(f.seal);
    const row = records[0].record;
    const event = f.events[0];
    if (kind === "owner")
      event.founder_id = "99999999-9999-4999-8999-999999999999";
    if (kind === "task") event.task_id = "99999999-9999-4999-8999-999999999999";
    if (kind === "revision") event.lifecycle_revision += 1;
    if (kind === "brief") event.brief_hash = "e".repeat(64);
    if (kind === "outcome") event.outcome_hash = "e".repeat(64);
    if (kind === "repository") event.repository = "Other/Repository";
    if (
      ![
        "withdrawn",
        "signature",
        "admitted_future",
        "admitted_invalid",
      ].includes(kind)
    )
      records[0] = f.seal(event);
    if (kind === "withdrawn") row.withdrawal_of = row.id;
    if (kind === "signature") row.signature = "A".repeat(86) + "==";
    if (kind === "admitted_future") row.admitted_at = "2026-10-16T00:01:00Z";
    if (kind === "admitted_invalid") row.admitted_at = "invalid";
    await f.run(records);
    expect(f.observations.engineering?.reviewApproved).toBe(false);
  });
  it.each(["head", "pr", "verifier", "policy", "same_vendor", "exempt"])(
    "does not accept a review with wrong %s",
    async (kind) => {
      const f = fixture();
      const event = f.events[0];
      if (event.event_kind !== "independent_review_verified")
        throw new Error("fixture");
      if (kind === "head") {
        event.payload.head_sha = "e".repeat(40);
        event.release_id = event.payload.head_sha;
      }
      if (kind === "pr") event.payload.pull_request = 43;
      if (kind === "verifier") event.payload.verifier_digest = "e".repeat(64);
      if (kind === "policy")
        event.payload.collector_policy_digest = "e".repeat(64);
      if (kind === "same_vendor") event.payload.reviewer.vendor = "OPENAI";
      if (kind === "exempt")
        (event.payload as unknown as Record<string, unknown>).validation =
          "exempt";
      await f.run();
      expect(f.observations.engineering?.reviewApproved).toBe(false);
    },
  );
  it.each([
    "domain",
    "project",
    "team",
    "merge",
    "alias",
    "founder",
    "staging",
    "stale",
    "future",
    "order",
  ])("does not accept a journey with wrong %s", async (kind) => {
    const f = fixture();
    const event = f.events[1];
    if (event.event_kind !== "production_journey_verified")
      throw new Error("fixture");
    if (kind === "domain")
      event.payload.canonical_origin = "https://other.example";
    if (kind === "project") event.payload.provider_project_id = "prj_other";
    if (kind === "team") event.payload.provider_team_id = "team_other";
    if (kind === "merge") {
      event.payload.merge_sha = "e".repeat(40);
      event.payload.alias_start.merge_sha = event.payload.merge_sha;
      event.payload.alias_end.merge_sha = event.payload.merge_sha;
    }
    if (kind === "alias") event.payload.alias_end.deployment_id = "dpl_other";
    if (kind === "founder") {
      event.subject.id = "99999999-9999-4999-8999-999999999999";
      event.payload.authenticated_subject.id = event.subject.id;
    }
    if (kind === "staging") event.environment = "staging";
    if (kind === "stale") {
      event.occurred_at = "2026-10-15T23:00:00Z";
      event.payload.alias_start.observed_at = event.occurred_at;
      event.payload.alias_end.observed_at = event.occurred_at;
    }
    if (kind === "future")
      event.payload.alias_end.observed_at = "2026-10-16T00:01:00Z";
    if (kind === "order") event.payload.steps.reverse();
    await f.run();
    expect(f.observations.release).toBeUndefined();
  });
  it("does not renew a signed journey when provider observations refresh", async () => {
    const f = fixture();
    await f.run();
    const original = f.observations.observedAt;
    f.observations.observedAt = "2026-10-16T00:10:00Z";
    await f.run();
    expect(f.observations.observedAt).toBe(original);
  });
  it("expires an old journey on refresh instead of retaining a previously passing release", async () => {
    const f = fixture();
    await f.run();
    f.observations.observedAt = "2026-10-16T00:20:00Z";
    await f.run();
    expect(f.observations.release).toBeUndefined();
  });
  it.each([
    "unapproved",
    "actor",
    "project",
    "pr_reference",
    "github_error",
    "unmerged",
    "wrong_engineering_repo",
  ])("does not transplant current %s authority", async (kind) => {
    const f = fixture();
    if (kind === "unapproved")
      (f.task.metadata.lifecycle as Record<string, unknown>).approval = null;
    if (kind === "actor")
      (
        (f.task.metadata.lifecycle as Record<string, unknown>)
          .approval as Record<string, unknown>
      ).actorId = "99999999-9999-4999-8999-999999999999";
    if (kind === "project") f.task.project_key = "other";
    if (kind === "pr_reference")
      f.observations.engineering!.prUrl =
        "https://github.com/CleanExpo/Unite-Group/pull/43";
    if (kind === "github_error") f.observations.sources.github = "error";
    if (kind === "unmerged") f.observations.engineering!.merged = false;
    if (kind === "wrong_engineering_repo")
      f.observations.engineering!.repository = "Other/Repo";
    await f.run();
    const releaseBlocked = [
      "unmerged",
      "wrong_engineering_repo",
      "github_error",
    ].includes(kind);
    expect(
      releaseBlocked
        ? f.observations.release
        : f.observations.engineering?.reviewApproved,
    ).toBe(releaseBlocked ? undefined : false);
  });
  it.each([
    "internal",
    "release",
    "account",
    "customer",
    "product",
    "registration",
    "unverified_binding",
  ])("excludes %s from per-idea customer activation", async (kind) => {
    const f = fixture();
    const event = f.events[2];
    if (event.event_kind !== "customer_value_achieved")
      throw new Error("fixture");
    if (kind === "internal") {
      event.event_kind = "reviewed_handoff_persisted" as never;
      (event as unknown as Record<string, unknown>).payload = {
        adapter_version: "factory_handoff_v1",
        handoff_id: "handoff1",
        handoff_digest: digest,
        persisted_metadata_digest: digest,
      };
    }
    if (kind === "release") event.release_id = "dpl_old";
    if (kind === "account")
      event.payload.stripe_binding.account_id = "acct_other";
    if (kind === "customer") event.subject.id = "cus_other";
    if (kind === "product")
      event.payload.stripe_binding.product_id = "prod_other";
    if (kind === "registration") {
      event.event_name = "customer_registered";
      event.payload.action_name = event.event_name;
    }
    if (kind === "unverified_binding")
      event.payload.stripe_binding.verified_at = "2026-10-16T00:01:00Z";
    await f.run();
    expect(f.observations.activations).toEqual([]);
  });
  it("reports storage failure without retaining any passing evidence", async () => {
    const f = fixture();
    await projectEnrolledIdeaEvidence(
      f.task,
      f.project,
      outcome,
      f.observations,
      {
        loadEvidence: async () => {
          throw new Error("DB unavailable");
        },
      },
    );
    expect(f.observations).toMatchObject({
      engineering: { reviewApproved: false },
      release: undefined,
      activations: [],
      sources: { activation: "error", deployment: "error" },
    });
  });
  it("loads enrolled internal evidence before the commercial-outcome early return", async () => {
    const f = fixture(null);
    const loadEvidence = vi.fn(async () => []);
    await observeIdeaLifecycle(f.task, f.project, null, {
      now: () => new Date(now),
      loadEvidence,
    });
    expect(loadEvidence).toHaveBeenCalledWith(founder, f.task.id);
  });
});
