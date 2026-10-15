import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createIdeaLifecycle,
  applyLifecycleCommand,
  type IdeaLifecycle,
} from "../idea-lifecycle";
import {
  createResearchRun,
  researchStartSchema,
  researchRequestMatches,
  readResearchRun,
  researchAuthorityHolds,
  claimResearchRun,
  heartbeatResearchRun,
  checkpointResearchRun,
  completeResearchRun,
  blockResearchRun,
  cancelResearchRun,
  recoverResearchRun,
  researchResultSchema,
  researchRunSchema,
  researchSourceProvenance,
  type ResearchStart,
  type ResearchContext,
  type ResearchWorkerContext,
  type ResearchResult,
  type ResearchCheckpoint,
} from "../idea-research";

const founderId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const runId = "44444444-4444-4444-8444-444444444444";
const leaseToken = "55555555-5555-4555-8555-555555555555";
const now = "2026-10-15T03:00:00.000Z";
const owner: ResearchContext = { founderId, taskId, actorId: founderId, now };
const worker: ResearchWorkerContext = {
  founderId,
  taskId,
  runnerId: "research-host",
  leaseToken,
  now,
};
const later = (seconds: number) =>
  new Date(Date.parse(now) + seconds * 1000).toISOString();
function lifecycle(
  rawIdea = "Investigate a restoration simulation; no building authority.",
): IdeaLifecycle {
  const captured = createIdeaLifecycle(
    { rawIdea, title: "Research an incomplete idea", requestId },
    { actorId: founderId, now },
  );
  return applyLifecycleCommand(
    captured,
    {
      action: "set_mandate",
      taskId,
      expectedRevision: captured.revision,
      mandate: {
        objective: "Investigate alternatives",
        allowedSources: ["Public product documentation"],
        maximumSources: 5,
        spendLimitMinor: 0,
        currency: "AUD",
        paidApiAllowed: false,
        timeLimitMinutes: 10,
        concurrencyLimit: 1,
      },
    },
    { actorId: founderId, now },
  );
}
function start(idea = lifecycle()): ResearchStart {
  return {
    action: "start",
    taskId,
    expectedRevision: idea.revision,
    requestId,
    allowedDomains: ["example.com"],
    limits: {
      maximumSources: 3,
      timeLimitMinutes: 5,
      maxTurns: 6,
      concurrency: 1,
    },
  };
}
function queued(idea = lifecycle()) {
  return createResearchRun(idea, start(idea), { ...owner, runId });
}
function running(idea = lifecycle()) {
  return claimResearchRun(idea, queued(idea), worker);
}
function checkpoint(sequence = 1): ResearchCheckpoint {
  return {
    sequence,
    summary: "Partial options found",
    nextStep: "Compare counter-evidence",
    sourceIds: ["source1"],
    toolCalls: 1,
    turnsUsed: 1,
  };
}
function finalRunning(idea = lifecycle()) {
  return checkpointResearchRun(
    idea,
    running(idea),
    { ...checkpoint(), usageFinal: true },
    worker,
  );
}
function result(): ResearchResult {
  return {
    schemaVersion: 1,
    kind: "untrusted_research_proposal",
    summary: "An option to review; demand remains unverified",
    sources: [
      {
        id: "source1",
        label: "A proposed public source",
        reference: "https://example.com/research",
        kind: "primary",
        independenceGroup: "example",
        limitations: ["Model-proposed; review required"],
        capturedAt: now,
      },
    ],
    claims: [
      {
        id: "claim1",
        statement: "This option might help",
        classification: "hypothesis",
        sourceIds: ["source1"],
        counterEvidenceIds: [],
        confidence: "low",
        limitations: ["No independently verified demand"],
      },
    ],
    openDecisions: ["First audience"],
    options: [
      {
        title: "Test a small experiment",
        benefits: ["Small scope"],
        risks: ["Unvalidated demand"],
      },
    ],
    proposedBrief: null,
  };
}

describe("bounded public research authority", () => {
  it("requests research for partial simulation or unrelated ideas without brief/build consent", () => {
    for (const idea of [
      lifecycle(),
      lifecycle("A local bookkeeping service experiment"),
    ]) {
      const before = structuredClone(idea);
      const run = queued(idea);
      expect(run.state).toBe("queued");
      expect(run.authority.scope).toBe("public_research_only");
      expect(run.authority.paidApiAllowed).toBe(false);
      expect(run.authority.subscriptionCredits).toBe("unknown");
      expect(idea).toEqual(before);
      expect(idea.approval).toBeNull();
      expect(idea.brief).toBeNull();
      expect(readResearchRun({ research: run })).toEqual(run);
    }
  });
  it("rejects owner, task, revision, source/time budget and injected permissions", () => {
    const idea = lifecycle();
    const request = start(idea);
    expect(() =>
      createResearchRun(idea, request, { ...owner, runId, actorId: requestId }),
    ).toThrow("owner");
    expect(() =>
      createResearchRun(
        idea,
        { ...request, expectedRevision: 1 },
        { ...owner, runId },
      ),
    ).toThrow("revision");
    expect(() =>
      createResearchRun(
        idea,
        { ...request, limits: { ...request.limits, maximumSources: 6 } },
        { ...owner, runId },
      ),
    ).toThrow("mandate");
    expect(() =>
      createResearchRun(
        idea,
        { ...request, limits: { ...request.limits, timeLimitMinutes: 11 } },
        { ...owner, runId },
      ),
    ).toThrow("mandate");
    expect(
      researchStartSchema.safeParse({ ...request, paidApiAllowed: true })
        .success,
    ).toBe(false);
    expect(
      researchStartSchema.safeParse({ ...request, allowedDomains: [] }).success,
    ).toBe(false);
    expect(
      researchStartSchema.safeParse({
        ...request,
        allowedDomains: ["127.0.0.1"],
      }).success,
    ).toBe(false);
    expect(
      researchStartSchema.safeParse({
        ...request,
        allowedDomains: ["service.internal"],
      }).success,
    ).toBe(false);
  });
  it("matches replay requests exactly and detects modified authority, input, mandate or owner", () => {
    const idea = lifecycle();
    const run = queued(idea);
    expect(researchRequestMatches(run, start(idea))).toBe(true);
    expect(
      researchRequestMatches(run, {
        ...start(idea),
        allowedDomains: ["other.com"],
      }),
    ).toBe(false);
    expect(
      readResearchRun({ research: { ...run, authorityHash: "a".repeat(64) } }),
    ).toBeNull();
    expect(
      researchAuthorityHolds(
        { ...idea, rawIdea: "Altered context" },
        run,
        owner,
      ),
    ).toBe(false);
    expect(
      researchAuthorityHolds(
        { ...idea, sources: [result().sources[0]] },
        run,
        owner,
      ),
    ).toBe(false);
    expect(
      researchAuthorityHolds(
        { ...idea, mandate: { ...idea.mandate!, objective: "Changed" } },
        run,
        owner,
      ),
    ).toBe(false);
    expect(
      researchAuthorityHolds(idea, run, { ...owner, founderId: requestId }),
    ).toBe(false);
    expect(
      researchAuthorityHolds(idea, run, { ...owner, now: later(86400) }),
    ).toBe(false);
  });
});

describe("durable research lease, checkpoints and recovery", () => {
  it("claims one lease and renews without moving original deadline or canonical lifecycle", () => {
    const idea = lifecycle();
    const run = running(idea);
    expect(run.startedAt).toBe(now);
    expect(run.deadlineAt).toBe(later(300));
    expect(run.lease?.expiresAt).toBe(later(90));
    expect(run.turnsReserved).toBe(6);
    expect(() =>
      claimResearchRun(idea, run, { ...worker, leaseToken: requestId }),
    ).toThrow("queued");
    const renewed = heartbeatResearchRun(idea, run, {
      ...worker,
      now: later(60),
    });
    expect(renewed.lease?.expiresAt).toBe(later(150));
    expect(renewed.deadlineAt).toBe(run.deadlineAt);
    expect(() =>
      heartbeatResearchRun(idea, run, { ...worker, leaseToken: requestId }),
    ).toThrow("lease");
  });
  it("checkpoints monotonically, deduplicates exact retries and retains cumulative admitted sources", () => {
    const idea = lifecycle();
    const first = checkpointResearchRun(
      idea,
      running(idea),
      checkpoint(),
      worker,
    );
    expect(checkpointResearchRun(idea, first, checkpoint(), worker)).toEqual(
      first,
    );
    const secondPayload = {
      ...checkpoint(2),
      sourceIds: ["source2"],
      turnsUsed: 2,
      toolCalls: 2,
    };
    const second = checkpointResearchRun(idea, first, secondPayload, worker);
    expect(second.checkpoint?.sourceIds).toEqual(["source1", "source2"]);
    expect(checkpointResearchRun(idea, second, secondPayload, worker)).toEqual(
      second,
    );
    expect(() =>
      checkpointResearchRun(
        idea,
        first,
        { ...checkpoint(2), turnsUsed: 0 },
        worker,
      ),
    ).toThrow("monotonically");
    expect(() =>
      checkpointResearchRun(
        idea,
        first,
        { ...checkpoint(2), sourceIds: ["s2", "s3", "s4"] },
        worker,
      ),
    ).toThrow("allowance");
    expect(() =>
      checkpointResearchRun(
        idea,
        first,
        { ...checkpoint(2), turnsUsed: 7 },
        worker,
      ),
    ).toThrow("allowance");
  });
  it("blocks unknown crashed turn usage instead of replenishing allowance on expired lease", () => {
    const idea = lifecycle();
    const first = checkpointResearchRun(
      idea,
      running(idea),
      checkpoint(),
      worker,
    );
    expect(() =>
      recoverResearchRun(idea, first, { ...owner, now: later(60) }),
    ).toThrow("active worker");
    const recovered = recoverResearchRun(idea, first, {
      ...owner,
      now: later(100),
    });
    expect(recovered.state).toBe("blocked");
    expect(recovered.error?.code).toBe("usage_unknown");
    expect(recovered.turnsReserved).toBe(6);
    expect(recovered.deadlineAt).toBe(first.deadlineAt);
    expect(() =>
      claimResearchRun(idea, recovered, { ...worker, now: later(100) }),
    ).toThrow("queued");
    expect(() =>
      blockResearchRun(
        idea,
        running(idea),
        { code: "provider_error", message: "Stopped without usage" },
        worker,
        true,
      ),
    ).toThrow("final usage checkpoint");
    expect(() =>
      blockResearchRun(
        idea,
        first,
        { code: "provider_error", message: "Only partial usage known" },
        worker,
        true,
      ),
    ).toThrow("final usage checkpoint");
  });
  it("recovers acknowledged partial work with known usage and the original budget/deadline", () => {
    const idea = lifecycle();
    const first = finalRunning(idea);
    const stopped = blockResearchRun(
      idea,
      first,
      {
        code: "provider_busy",
        message: "Provider unavailable; no API fallback",
      },
      worker,
      true,
    );
    expect(stopped.state).toBe("partial");
    expect(stopped.turnsReserved).toBe(1);
    const recovered = recoverResearchRun(idea, stopped, {
      ...owner,
      now: later(100),
    });
    const second = claimResearchRun(idea, recovered, {
      ...worker,
      leaseToken: requestId,
      now: later(100),
    });
    expect(second.attempts).toBe(2);
    expect(second.deadlineAt).toBe(first.deadlineAt);
    expect(second.checkpoint).toEqual({
      ...first.checkpoint,
      usageFinal: false,
    });
    expect(() =>
      blockResearchRun(
        idea,
        second,
        { code: "crash", message: "New attempt crashed" },
        { ...worker, leaseToken: requestId, now: later(100) },
        true,
      ),
    ).toThrow("final usage checkpoint");
    expect(() =>
      heartbeatResearchRun(idea, second, {
        ...worker,
        leaseToken: requestId,
        now: later(301),
      }),
    ).toThrow("time allowance");
  });
  it("recovers a final usage acknowledgement after a worker crash without resetting its budget or deadline", () => {
    const idea = lifecycle();
    const acknowledged = finalRunning(idea);
    expect(acknowledged.turnsReserved).toBe(6);
    const recovered = recoverResearchRun(idea, acknowledged, {
      ...owner,
      now: later(100),
    });
    expect(recovered.state).toBe("queued");
    expect(recovered.turnsReserved).toBe(1);
    expect(recovered.deadlineAt).toBe(acknowledged.deadlineAt);
    const reclaimed = claimResearchRun(idea, recovered, {
      ...worker,
      leaseToken: requestId,
      now: later(100),
    });
    expect(
      reclaimed.authority.limits.maxTurns - reclaimed.checkpoint!.turnsUsed,
    ).toBe(5);
    expect(reclaimed.deadlineAt).toBe(acknowledged.deadlineAt);
    expect(reclaimed.checkpoint?.usageFinal).toBe(false);
    expect(acknowledged.checkpoint?.usageFinal).toBe(true);
  });
  it("requires final usage for success or reconciliation, including an explicit zero before model refusal", () => {
    const idea = lifecycle();
    const run = running(idea);
    expect(() => completeResearchRun(idea, run, result(), worker)).toThrow(
      "final usage checkpoint",
    );
    const zero = checkpointResearchRun(
      idea,
      run,
      {
        sequence: 1,
        summary: "Provider refused before model start",
        nextStep: "Retry within original allowance",
        sourceIds: [],
        toolCalls: 0,
        turnsUsed: 0,
        usageFinal: true,
      },
      worker,
    );
    const stopped = blockResearchRun(
      idea,
      zero,
      { code: "preflight_refused", message: "No provider turns consumed" },
      worker,
      true,
    );
    expect(stopped.turnsReserved).toBe(0);
    const recovered = recoverResearchRun(idea, stopped, {
      ...owner,
      now: later(10),
    });
    expect(
      claimResearchRun(idea, recovered, {
        ...worker,
        leaseToken: requestId,
        now: later(10),
      }).deadlineAt,
    ).toBe(run.deadlineAt);
    expect(() =>
      checkpointResearchRun(
        idea,
        zero,
        { ...checkpoint(2), usageFinal: false },
        worker,
      ),
    ).toThrow("already checkpointed");
  });
  it("revokes continuation on material changes, but permits cancellation and terminal cleanup", () => {
    const idea = lifecycle();
    const run = running(idea);
    const stale = { ...idea, revision: idea.revision + 1 };
    expect(() =>
      checkpointResearchRun(stale, run, checkpoint(), worker),
    ).toThrow("authority");
    expect(() => completeResearchRun(stale, run, result(), worker)).toThrow(
      "authority",
    );
    const stopped = blockResearchRun(
      stale,
      run,
      { code: "stop", message: "Stopped" },
      worker,
    );
    expect(stopped.error?.code).toBe("authority_stale");
    const cancelled = cancelResearchRun(stale, run, owner);
    expect(cancelled.state).toBe("cancelled");
    expect(cancelled.lease).toBeNull();
    expect(cancelResearchRun(stale, cancelled, owner)).toEqual(cancelled);
    expect(() => heartbeatResearchRun(idea, cancelled, worker)).toThrow(
      "authority",
    );
    expect(() => recoverResearchRun(idea, cancelled, owner)).toThrow();
    expect(() =>
      blockResearchRun(
        idea,
        cancelled,
        { code: "late", message: "Late worker" },
        worker,
      ),
    ).toThrow("current research worker");
  });
  it("records a timed-out worker as blocked after its deadline and redacts errors", () => {
    const idea = lifecycle();
    const stopped = blockResearchRun(
      idea,
      running(idea),
      { code: "timeout", message: "Error sk_test_ABC1234567890123456789" },
      { ...worker, now: later(301) },
    );
    expect(stopped.state).toBe("blocked");
    expect(stopped.error?.message).not.toContain("sk_test_");
    expect(() =>
      recoverResearchRun(idea, stopped, { ...owner, now: later(301) }),
    ).toThrow("time allowance");
  });
});

describe("untrusted research proposals and observed provenance", () => {
  it("exposes a strict JSON schema for the isolated subscription worker", () => {
    const schema = z.toJSONSchema(researchResultSchema);
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).toHaveProperty("proposedBrief");
    expect(schema.properties).not.toHaveProperty("toolObservations");
  });
  it("checks serialized schema bounds without a global Node Buffer", () => {
    const run = queued();
    vi.stubGlobal("Buffer", undefined);
    try {
      expect(researchRunSchema.safeParse(run).success).toBe(true);
      expect(researchResultSchema.safeParse(result()).success).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("completes proposals without applying claims, approving a brief or granting build authority", () => {
    const idea = lifecycle();
    const before = structuredClone(idea);
    const completed = completeResearchRun(
      idea,
      finalRunning(idea),
      result(),
      worker,
    );
    expect(completed.state).toBe("completed");
    expect(completed.result?.kind).toBe("untrusted_research_proposal");
    expect(idea).toEqual(before);
    expect(idea.claims).toEqual([]);
    expect(idea.approval).toBeNull();
    expect(researchSourceProvenance(completed, "source1")).toBe("unverified");
  });
  it("requires actual runner observations for tool provenance, distinct from model-proposed URLs", () => {
    const idea = lifecycle();
    const run = finalRunning(idea);
    const observation = {
      toolUseId: "tool1",
      tool: "WebFetch" as const,
      url: result().sources[0].reference,
      observedAt: now,
      status: "success" as const,
    };
    expect(
      researchSourceProvenance(
        completeResearchRun(idea, run, result(), worker, [observation]),
        "source1",
      ),
    ).toBe("tool_observed");
    expect(
      researchSourceProvenance(
        completeResearchRun(idea, run, result(), worker, [
          { ...observation, tool: "WebSearch" },
        ]),
        "source1",
      ),
    ).toBe("discovered");
    expect(
      researchSourceProvenance(
        completeResearchRun(idea, run, result(), worker, [
          { ...observation, status: "error" },
        ]),
        "source1",
      ),
    ).toBe("unverified");
    expect(
      researchResultSchema.safeParse({
        ...result(),
        toolObservations: [observation],
      }).success,
    ).toBe(false);
  });
  it("rejects unauthorised domains, claimed facts, unsupported references and oversized results", () => {
    const idea = lifecycle();
    const run = finalRunning(idea);
    const proposal = result();
    expect(() =>
      completeResearchRun(
        idea,
        run,
        {
          ...proposal,
          sources: [
            {
              ...proposal.sources[0],
              reference: "https://example.com.evil.test/source",
            },
          ],
        },
        worker,
      ),
    ).toThrow("domains");
    expect(
      researchResultSchema.safeParse({
        ...proposal,
        claims: [{ ...proposal.claims[0], classification: "reported_fact" }],
      }).success,
    ).toBe(false);
    expect(() =>
      completeResearchRun(
        idea,
        run,
        {
          ...proposal,
          claims: [{ ...proposal.claims[0], sourceIds: ["invented"] }],
        },
        worker,
      ),
    ).toThrow("evidence");
    const large = {
      ...proposal,
      openDecisions: Array.from({ length: 30 }, () => "x".repeat(4000)),
      options: [
        {
          title: "Large",
          benefits: Array.from({ length: 30 }, () => "x".repeat(4000)),
          risks: [],
        },
      ],
    };
    expect(() => completeResearchRun(idea, run, large, worker)).toThrow(
      "128 KiB",
    );
  });
  it("rejects tool observation identity/time spoofing and expired final responses", () => {
    const idea = lifecycle();
    const run = finalRunning(idea);
    const observation = {
      toolUseId: "tool1",
      tool: "WebFetch" as const,
      url: result().sources[0].reference,
      observedAt: later(1),
      status: "success" as const,
    };
    expect(() =>
      completeResearchRun(idea, run, result(), worker, [observation]),
    ).toThrow("time");
    expect(() =>
      completeResearchRun(idea, run, result(), worker, [
        { ...observation, observedAt: now },
        { ...observation, observedAt: now },
      ]),
    ).toThrow("unique");
    expect(() =>
      completeResearchRun(idea, run, result(), { ...worker, now: later(91) }),
    ).toThrow("lease");
  });
});
