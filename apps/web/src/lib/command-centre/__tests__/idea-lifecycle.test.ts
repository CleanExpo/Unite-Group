import { describe, expect, it } from "vitest";
import { canonicalHash } from "../portfolio-control-plane";
import {
  applyLifecycleCommand,
  createIdeaLifecycle,
  createLifecycleHandoff,
  ideaLifecycleApprovalHolds,
  lifecycleCommandSchema,
  readIdeaLifecycle,
  toLifecycleView,
  type IdeaLifecycle,
  type LifecycleBriefInput,
  type LifecycleObservations,
  type LifecycleUpdateCommand,
} from "../idea-lifecycle";

const actorId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const now = "2026-10-15T03:00:00.000Z";
const context = { actorId, now };
const source = {
  id: "interview",
  label: "Founder interview",
  reference: "https://example.com/interview",
  kind: "founder" as const,
  independenceGroup: "founder",
  limitations: ["Unvalidated preference"],
  capturedAt: now,
};
const mandate = {
  objective: "Investigate demand",
  allowedSources: ["Founder interview"],
  maximumSources: 2,
  spendLimitMinor: 0,
  currency: "AUD",
  paidApiAllowed: false as const,
};
const brief: LifecycleBriefInput = {
  objective: "Test demand for the idea",
  user: "Small business owner",
  payer: "Business owner",
  nonGoals: ["No automatic launch"],
  acceptanceCriteria: [
    {
      id: "AC1",
      criterion: "Evidence is traceable",
      validation: "Inspect source links",
    },
  ],
  outputs: Array.from({ length: 13 }, (_, index) => ({
    id: index + 1,
    status: "deferred" as const,
    content: "Needs evidence; explicit decision before build",
  })),
  design: {
    summary: "A reviewable research workbench",
    sourceIds: [source.id],
  },
  target: { repository: "CleanExpo/Unite-Group", baseBranch: "main" },
  risks: ["Demand unverified"],
  openDecisions: ["First offer"],
};
const outcome = {
  repository: "CleanExpo/Unite-Group",
  baseBranch: "main" as const,
  productId: "prod_idea",
  stripeAccountId: "acct_idea",
  activationEvent: "first_value",
  requiredClients: 2,
  currency: "AUD",
  minimumNetMinor: 100,
  windowStart: "2026-10-01T00:00:00.000Z",
  windowEnd: "2026-10-31T00:00:00.000Z",
};
function capture(rawIdea = "A service idea unrelated to cleaning.") {
  return createIdeaLifecycle(
    { rawIdea, title: "Research an idea", requestId },
    context,
  );
}
function command(
  state: IdeaLifecycle,
  payload: Record<string, unknown>,
): IdeaLifecycle {
  return applyLifecycleCommand(
    state,
    {
      ...payload,
      taskId,
      expectedRevision: state.revision,
    } as LifecycleUpdateCommand,
    context,
  );
}
function proposed() {
  let state = command(capture(), { action: "set_mandate", mandate });
  state = command(state, {
    action: "record_research",
    sources: [source],
    claims: [
      {
        id: "claim1",
        statement: "Founder prefers a small experiment",
        classification: "preference",
        sourceIds: [source.id],
        counterEvidenceIds: [],
        confidence: "high",
        limitations: ["Does not prove customer demand"],
      },
    ],
    openDecisions: ["Offer"],
  });
  state = command(state, {
    action: "checkpoint",
    checkpoint: {
      status: "partial",
      summary: "Preference captured; demand unknown",
      nextStep: "Interview prospects",
      blockers: [],
    },
  });
  state = command(state, { action: "set_outcome", outcome });
  return command(state, { action: "propose_brief", brief });
}
function approved() {
  const state = proposed();
  return command(state, {
    action: "approve_brief",
    briefHash: state.brief!.hash,
  });
}
function proof(): LifecycleObservations {
  const state = approved();
  return {
    observedAt: now,
    stripeAccountId: outcome.stripeAccountId,
    lifecycleRevision: state.revision,
    briefHash: state.brief!.hash,
    outcomeHash: canonicalHash(state.outcome),
    sources: {
      github: "connected",
      stripe: "connected",
      activation: "connected",
      deployment: "connected",
    },
    engineering: {
      repository: outcome.repository,
      baseBranch: "main",
      headSha: "a".repeat(40),
      mergeSha: "b".repeat(40),
      prUrl: "https://github.com/CleanExpo/Unite-Group/pull/1",
      merged: true,
      checksPassed: true,
      reviewApproved: true,
    },
    release: {
      repository: outcome.repository,
      commitSha: "b".repeat(40),
      releaseId: "release1",
      url: "https://example.com",
      live: true,
      journeyPassed: true,
    },
    activations: ["customer1", "customer2"].map((customerId) => ({
      customerId,
      productId: outcome.productId,
      releaseId: "release1",
      event: "first_value",
      occurredAt: "2026-10-14T00:00:00.000Z",
    })),
    payments: ["customer1", "customer2"].map((customerId, index) => ({
      eventId: `event${index}`,
      paymentId: `payment${index}`,
      customerId,
      productId: outcome.productId,
      currency: "AUD",
      amountMinor: 150,
      refundedMinor: 0,
      disputed: false,
      live: true,
      status: "succeeded",
      occurredAt: "2026-10-14T00:00:00.000Z",
    })),
    limitations: [],
  };
}

describe("idea lifecycle research and immutable authority", () => {
  it("preserves a partial simulation intake verbatim without choosing domain-specific requirements or dispatch", () => {
    const raw = `  Australian restoration simulation\nQuestions unanswered\n${"reference ".repeat(1800)}  `;
    const state = capture(raw);
    expect(state.rawIdea).toBe(raw);
    expect(state.brief).toBeNull();
    expect(state.approval).toBeNull();
    expect(toLifecycleView(state).stage).toBe("captured");
    expect(capture().rawIdea).toContain("unrelated to cleaning");
    expect(
      lifecycleCommandSchema.safeParse({
        action: "capture",
        rawIdea: "  ",
        title: "Idea",
        requestId,
      }).success,
    ).toBe(false);
  });
  it("rejects browser proof, authority actor, oversize and stale revisions", () => {
    expect(
      lifecycleCommandSchema.safeParse({
        action: "capture",
        rawIdea: "idea",
        title: "Idea",
        requestId,
        verified: true,
      }).success,
    ).toBe(false);
    expect(
      lifecycleCommandSchema.safeParse({
        action: "approve_brief",
        taskId,
        expectedRevision: 1,
        briefHash: "a".repeat(64),
        actorId,
      }).success,
    ).toBe(false);
    expect(() => capture("x".repeat(50001))).toThrow();
    expect(() =>
      applyLifecycleCommand(
        capture(),
        { action: "set_mandate", taskId, expectedRevision: 2, mandate },
        context,
      ),
    ).toThrow("Reload");
  });
  it("bounds combined state and rejects executable or credential-bearing evidence URLs", () => {
    const sources = Array.from({ length: 5 }, (_, index) => ({
      ...source,
      id: `s${index}`,
      limitations: Array.from({ length: 30 }, () => "x".repeat(4000)),
    }));
    expect(() =>
      command(capture(), {
        action: "record_research",
        sources,
        claims: [],
        openDecisions: [],
      }),
    ).toThrow("512 KiB");
    expect(
      readIdeaLifecycle({ lifecycle: { ...capture(), sources } }),
    ).toBeNull();
    for (const reference of [
      "javascript:alert(1)",
      "https://name:password@example.com",
      "not a URL",
    ]) {
      expect(() =>
        command(capture(), {
          action: "record_research",
          sources: [{ ...source, reference }],
          claims: [],
          openDecisions: [],
        }),
      ).toThrow("HTTP(S)");
    }
  });
  it("retains classified preference and counter-evidence without turning confidence into verification", () => {
    const state = command(capture(), {
      action: "record_research",
      sources: [
        source,
        { ...source, id: "contrary", independenceGroup: "independent" },
      ],
      claims: [
        {
          id: "c",
          statement: "Demand exists",
          classification: "hypothesis",
          confidence: "high",
          sourceIds: [source.id],
          counterEvidenceIds: ["contrary"],
          limitations: ["No observed purchases"],
        },
      ],
      openDecisions: [],
    });
    expect(state.claims[0].classification).toBe("hypothesis");
    expect(state.claims[0].counterEvidenceIds).toEqual(["contrary"]);
    expect(
      toLifecycleView(state).milestones.find((item) => item.id === "build")
        ?.status,
    ).toBe("not_connected");
    expect(() =>
      command(state, {
        action: "record_research",
        sources: [],
        claims: state.claims,
        openDecisions: [],
      }),
    ).toThrow("reference");
  });
  it("enforces source allowance and all 13 explicit outputs", () => {
    const state = command(capture(), {
      action: "set_mandate",
      mandate: { ...mandate, maximumSources: 1 },
    });
    expect(() =>
      command(state, {
        action: "record_research",
        sources: [source, { ...source, id: "other" }],
        claims: [],
        openDecisions: [],
      }),
    ).toThrow("allowance");
    expect(() =>
      command(proposed(), {
        action: "propose_brief",
        brief: {
          ...brief,
          outputs: brief.outputs.map((output) => ({ ...output, id: 1 })),
        },
      }),
    ).toThrow("13");
  });
  it("binds server actor to exact immutable snapshot, revokes on any material edit and rejects tampering", () => {
    const state = approved();
    expect(ideaLifecycleApprovalHolds(state)).toBe(true);
    expect(state.approval?.actorId).toBe(actorId);
    expect(state.approval?.scope).toBe("research_brief_only");
    const exported = createLifecycleHandoff(state);
    expect(exported.manifest.mode).toBe("non_executable_draft");
    expect(exported.prompt).toContain("branch_preview_only");
    expect(JSON.stringify(exported)).not.toContain(state.rawIdea);
    exported.manifest.target.repository = "Someone/Else";
    expect(state.brief?.snapshot.brief.target.repository).toBe(
      outcome.repository,
    );
    const saved = command(state, { action: "create_handoff" });
    expect(readIdeaLifecycle({ lifecycle: saved })).not.toBeNull();
    const tampered = structuredClone(saved);
    tampered.brief!.snapshot.brief.objective = "Different";
    expect(readIdeaLifecycle({ lifecycle: tampered })).toBeNull();
    const hashTamper = structuredClone(saved);
    hashTamper.handoff!.manifestHash = "a".repeat(64);
    expect(readIdeaLifecycle({ lifecycle: hashTamper })).toBeNull();
    const next = command(saved, {
      action: "checkpoint",
      checkpoint: {
        status: "blocked",
        summary: "Contradiction found",
        nextStep: "Research",
        blockers: ["Needs review"],
      },
    });
    expect(next.revision).toBe(saved.revision + 1);
    expect(next.approval).toBeNull();
    expect(next.handoff).toBeNull();
    expect(saved.approval).not.toBeNull();
    expect(() =>
      command(next, { action: "approve_brief", briefHash: state.brief!.hash }),
    ).toThrow("current immutable");
  });
  it("keeps prior brief immutable and separates revocation from delivery consent", () => {
    const original = approved();
    const revised = command(original, {
      action: "propose_brief",
      brief: { ...brief, objective: "A corrected goal" },
    });
    expect(revised.briefHistory[0]).toEqual(original.brief);
    expect(original.brief?.snapshot.brief.objective).toBe(brief.objective);
    expect(
      ideaLifecycleApprovalHolds(
        command(original, { action: "revoke_approval" }),
      ),
    ).toBe(false);
  });
  it("records annotated reference rights separately and invalidates approval when references change", () => {
    const state = approved();
    const next = command(state, {
      action: "record_research",
      sources: [
        {
          ...source,
          annotation: "The navigation hierarchy is useful",
          rightsStatus: "permission_required",
        },
      ],
      claims: state.claims,
      openDecisions: state.openDecisions,
    });
    expect(next.approval).toBeNull();
    const revised = command(next, { action: "propose_brief", brief });
    const exported = createLifecycleHandoff(revised);
    expect(exported.manifest.snapshot.sourceRefs[0].rightsStatus).toBe(
      "permission_required",
    );
    expect(exported.prompt).toContain("not legal verification");
  });
  it("redacts recognised credentials from every export while retaining original evidence and a valid manifest hash", () => {
    const secret = "sk_test_ABC1234567890123456789";
    const encodedSecret = secret.replaceAll("_", "%5F");
    const sensitiveSource = {
      ...source,
      annotation: `Access key ${secret}`,
      reference: `https://example.com/evidence?access=${encodedSecret}&view=research`,
    };
    let state = command(proposed(), {
      action: "record_research",
      sources: [sensitiveSource],
      claims: [],
      openDecisions: [`Confirm access ${secret}`],
    });
    state = command(state, {
      action: "propose_brief",
      brief: {
        ...brief,
        objective: `Investigate with ${secret}`,
        user: `User ${secret}`,
        payer: `Payer ${secret}`,
        acceptanceCriteria: [
          {
            id: "AC1",
            criterion: `Criterion ${secret}`,
            validation: `Validate ${secret}`,
          },
        ],
        outputs: brief.outputs.map((output) => ({
          ...output,
          content: `Evidence ${secret}; https://example.com/?token=${secret}`,
        })),
        design: { ...brief.design, summary: `Design ${secret}` },
        risks: [`Risk ${secret}`],
        nonGoals: [`Exclude ${secret}`],
        openDecisions: [`Decision ${secret}`],
      },
    });
    const before = structuredClone(state);
    const exported = createLifecycleHandoff(state);
    expect(JSON.stringify(exported)).not.toContain(secret);
    expect(JSON.stringify(exported)).not.toContain(encodedSecret);
    expect(exported.manifest.snapshot.sourceRefs[0].reference).toBe(
      "https://example.com/evidence?access=redacted&view=research",
    );
    expect(exported.prompt).toContain("redacted");
    const { manifestHash, ...binding } = exported.manifest;
    expect(manifestHash).toBe(canonicalHash(binding));
    expect(state).toEqual(before);
    expect(state.sources[0].annotation).toContain(secret);
    const saved = command(state, { action: "create_handoff" });
    expect(readIdeaLifecycle({ lifecycle: saved })).not.toBeNull();
  });
});

describe("subordinate whole-journey evidence projection", () => {
  it("shows deployment receipts while retaining blocked journey and rejects another merge or expired snapshot", () => {
    const state = approved();
    const observations = proof();
    observations.release = undefined;
    observations.deployment = {
      repository: outcome.repository,
      commitSha: "b".repeat(40),
      deploymentId: 301,
      statusId: 401,
      environment: "Production – unite-group",
      url: "https://unite-group.in",
      createdAt: now,
      updatedAt: now,
      statusCreatedAt: now,
      statusUpdatedAt: now,
      creatorId: 35613825,
      creatorLogin: "vercel[bot]",
      providerProductionEnvironment: false,
      registeredProjectId: "prj_registered",
      registeredTeamId: "team_registered",
      coverage: "latest_environment_window",
      historicalCoverageComplete: false,
      environmentWindowSize: 1,
      currentServing: false,
    };
    let view = toLifecycleView(state, observations, now);
    expect(view.milestones.find((item) => item.id === "launch")).toMatchObject({
      status: "blocked",
      evidence: expect.arrayContaining(["github:deployment:301"]),
    });
    expect(view.commercial.status).toBe("not_achieved");
    expect(view.commercial.eligibleClients).toBe(0);
    observations.deployment.commitSha = "c".repeat(40);
    expect(
      toLifecycleView(state, observations, now).milestones.find(
        (item) => item.id === "launch",
      )?.evidence,
    ).toEqual([]);
    observations.deployment.commitSha = "b".repeat(40);
    observations.observedAt = "2026-10-14T00:00:00.000Z";
    view = toLifecycleView(state, observations, now);
    expect(view.milestones.find((item) => item.id === "launch")).toMatchObject({
      status: "not_connected",
      evidence: [],
    });
  });
  it("never promotes absent proof or a task.done flag", () => {
    const state = { ...approved(), taskStatus: "done" } as IdeaLifecycle;
    const progress = toLifecycleView(state);
    expect(progress.commercial.status).toBe("not_connected");
    expect(
      progress.milestones.find((item) => item.id === "merge")?.status,
    ).toBe("not_connected");
  });
  it("requires correct repo/main/commit/live journey and checks independently", () => {
    const state = approved();
    const observations = proof();
    expect(toLifecycleView(state, observations, now).commercial.status).toBe(
      "achieved",
    );
    observations.engineering!.baseBranch = "dev";
    expect(
      toLifecycleView(state, observations, now).commercial.eligibleClients,
    ).toBe(0);
    observations.engineering!.baseBranch = "main";
    observations.release!.commitSha = "c".repeat(40);
    expect(
      toLifecycleView(state, observations, now).milestones.find(
        (item) => item.id === "launch",
      )?.status,
    ).toBe("blocked");
    observations.release!.commitSha = "b".repeat(40);
    observations.engineering!.checksPassed = false;
    const view = toLifecycleView(state, observations, now);
    expect(view.milestones.find((item) => item.id === "merge")?.status).toBe(
      "verified",
    );
    expect(view.commercial.status).toBe("not_achieved");
  });
  it("deduplicates payment replay, separates currencies and excludes test, pending, refunded and disputed payments", () => {
    const state = approved();
    const observations = proof();
    observations.payments.push({ ...observations.payments[0] });
    expect(
      toLifecycleView(state, observations, now).commercial.netByCurrency.AUD,
    ).toBe(300);
    observations.payments.push({
      ...observations.payments[0],
      eventId: "refund",
      refundedMinor: 50,
    });
    expect(
      toLifecycleView(state, observations, now).commercial.eligibleClients,
    ).toBe(1);
    expect(
      toLifecycleView(state, observations, now).commercial.netByCurrency.AUD,
    ).toBe(250);
    observations.payments[1].currency = "USD";
    const view = toLifecycleView(state, observations, now);
    expect(view.commercial.netByCurrency).toEqual({ AUD: 100, USD: 150 });
    expect(view.commercial.eligibleClients).toBe(0);
    for (const change of [
      { live: false },
      { status: "pending" as const },
      { disputed: true },
    ]) {
      const changed = proof();
      changed.payments[0] = { ...changed.payments[0], ...change };
      expect(
        toLifecycleView(state, changed, now).commercial.eligibleClients,
      ).toBe(1);
    }
  });
  it("requires account, product, activation release/time and fresh provider evidence", () => {
    const state = approved();
    for (const change of [
      "account",
      "product",
      "release",
      "time",
      "freshness",
    ] as const) {
      const observations = proof();
      if (change === "account") observations.stripeAccountId = "acct_other";
      if (change === "product")
        observations.payments[0].productId = "prod_other";
      if (change === "release")
        observations.activations[0].releaseId = "old_release";
      if (change === "time")
        observations.payments[0].occurredAt = "2026-09-01T00:00:00.000Z";
      if (change === "freshness")
        observations.observedAt = "2026-10-14T00:00:00.000Z";
      expect(
        toLifecycleView(state, observations, now).commercial.status,
      ).not.toBe("achieved");
    }
    expect(toLifecycleView(capture(), proof(), now).commercial.status).toBe(
      "blocked",
    );
  });
  it("rejects previous evidence after a new brief or outcome revision", () => {
    const state = approved();
    const observations = proof();
    const revised = command(state, { action: "propose_brief", brief });
    const reapproved = command(revised, {
      action: "approve_brief",
      briefHash: revised.brief!.hash,
    });
    expect(
      toLifecycleView(reapproved, observations, now).commercial.status,
    ).toBe("not_connected");
    const poisoned = { ...observations, outcomeHash: "a".repeat(64) };
    expect(
      toLifecycleView(state, poisoned, now).commercial.eligibleClients,
    ).toBe(0);
  });
});
