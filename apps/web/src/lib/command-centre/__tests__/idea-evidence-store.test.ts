import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalEvidenceJson,
  hashIdeaEvidence,
  ideaEvidenceSignatureMessage,
  type IdeaEvidenceEnvelope,
  type IdeaEvidenceGrant,
  type IdeaEvidenceSourceRegistration,
} from "../idea-evidence-contracts";
import {
  admitExternalIdeaEvidence,
  enrollIdeaEvidenceSource,
  listTaskIdeaEvidence,
  persistReviewedHandoff,
  revokeIdeaEvidenceGrant,
  withdrawIdeaEvidence,
  type IdeaEvidenceClient,
} from "../idea-evidence-store";

const keys = generateKeyPairSync("ed25519");
const founder = "11111111-1111-4111-8111-111111111111";
const task = "22222222-2222-4222-8222-222222222222";
const grantId = "33333333-3333-4333-8333-333333333333";
const eventId = "44444444-4444-4444-8444-444444444444";
const now = "2026-10-16T01:00:00.000Z";
const digest = "a".repeat(64);
function fixture() {
  const source: IdeaEvidenceSourceRegistration = {
    source_id: "mac-review",
    version: 1,
    kind: "ed25519",
    event_kind: "independent_review_verified",
    adapter_version: "nexus_release_gate_v1",
    repository: "CleanExpo/Unite-Group",
    product_id: "factory",
    environment: "production",
    review_policy: {
      verifier_digest: digest,
      collector_policy_digest: digest,
      implementer_vendor: "openai",
    },
    public_key: keys.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
  const grant: IdeaEvidenceGrant = {
    grant_id: grantId,
    version: 1,
    source_id: source.source_id,
    source_version: 1,
    founder_id: founder,
    task_id: task,
    lifecycle_revision: 3,
    brief_hash: digest,
    outcome_hash: null,
    outcome_canonical: "null",
    repository: source.repository,
    product_id: source.product_id,
    release_id: "b".repeat(40),
    environment: "production",
    subject: { namespace: "operator", id: founder },
    event_name: "review_verified",
    contract_hash: digest,
    valid_from: "2026-10-15T00:00:00.000Z",
    valid_until: "2026-10-17T00:00:00.000Z",
    stripe_binding: null,
  };
  const envelope: IdeaEvidenceEnvelope = {
    source_id: source.source_id,
    source_version: 1,
    grant_id: grantId,
    grant_version: 1,
    event_id: "review-1",
    event_kind: "independent_review_verified",
    founder_id: founder,
    task_id: task,
    lifecycle_revision: 3,
    brief_hash: digest,
    outcome_hash: null,
    repository: source.repository,
    product_id: source.product_id,
    release_id: grant.release_id,
    environment: "production",
    subject: grant.subject,
    event_name: grant.event_name,
    contract_hash: digest,
    occurred_at: now,
    payload: {
      adapter_version: "nexus_release_gate_v1",
      pull_request: 1188,
      base_sha: "c".repeat(40),
      head_sha: grant.release_id,
      receipt_digest: digest,
      report_digest: digest,
      mirror_digest: digest,
      execution_provenance_digest: digest,
      verifier_digest: digest,
      verifier_version: "v1",
      collector_policy_digest: digest,
      validation: "validated_non_exempt",
      reviewer: {
        vendor: "minimax",
        model: "MiniMax-M3",
        session_id: "session-1",
      },
    },
  };
  const registration = (value: typeof source | typeof grant) => ({
    ...("grant_id" in value
      ? {
          grant_id: grantId,
          source_id: source.source_id,
          source_version: 1,
          founder_id: founder,
          task_id: task,
        }
      : { source_id: source.source_id }),
    version: 1,
    registration: value,
    canonical_registration: canonicalEvidenceJson(value),
    registration_hash: hashIdeaEvidence(value),
    revoked_at: null as string | null,
  });
  const signature = sign(
    null,
    ideaEvidenceSignatureMessage(envelope),
    keys.privateKey,
  ).toString("base64");
  const event = {
    id: eventId,
    source_id: source.source_id,
    source_version: 1,
    event_id: envelope.event_id,
    grant_id: grantId,
    grant_version: 1,
    founder_id: founder,
    task_id: task,
    record_kind: "evidence",
    withdrawal_of: null,
    envelope,
    canonical_envelope: canonicalEvidenceJson(envelope),
    payload_hash: hashIdeaEvidence(envelope),
    signature,
    occurred_at: now,
    admitted_at: now,
  };
  return {
    source,
    grant,
    envelope,
    signature,
    event,
    sourceRow: registration(source),
    grantRow: registration(grant),
  };
}
function database(
  rows: Record<string, unknown>,
  rpcResult: unknown,
  code?: string,
) {
  const filters: Array<[string, string, unknown]> = [];
  const from = vi.fn((table: string) => {
    const response = { data: rows[table] ?? null, error: null };
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: unknown) => {
        filters.push([table, key, value]);
        return query;
      }),
      limit: vi.fn(() => query),
      order: vi.fn(() => query),
      maybeSingle: vi.fn(async () => response),
      then: (resolve: (value: typeof response) => unknown) =>
        Promise.resolve(response).then(resolve),
    };
    return query;
  });
  const rpc = vi.fn(async () => ({
    data: rpcResult,
    error: code ? { code } : null,
  }));
  return {
    client: { from, rpc } as unknown as IdeaEvidenceClient,
    rpc,
    filters,
  };
}
function fixtureDb(
  value = fixture(),
  rpcResult: unknown = value.event,
  code?: string,
) {
  return database(
    {
      cc_idea_evidence_sources: value.sourceRow,
      cc_idea_evidence_grants: value.grantRow,
      cc_idea_evidence_events: value.event,
    },
    rpcResult,
    code,
  );
}
describe("service-owned idea evidence store", () => {
  it("verifies enrolled signatures and confirms exact admission with locked registration hashes", async () => {
    const value = fixture();
    value.event.occurred_at = "2026-10-16T01:00:00+00:00";
    const db = fixtureDb(value);
    const admitted = await admitExternalIdeaEvidence(value, db);
    expect(admitted.id).toBe(eventId);
    expect(db.rpc).toHaveBeenCalledWith(
      "cc_idea_evidence_admit_v1",
      expect.objectContaining({
        p_verified_source_hash: value.sourceRow.registration_hash,
        p_verified_grant_hash: value.grantRow.registration_hash,
      }),
    );
    expect(db.filters).toContainEqual([
      "cc_idea_evidence_events",
      "founder_id",
      founder,
    ]);
  });
  it("refuses an unregistered issuer before admission", async () => {
    const db = database({}, null);
    await expect(
      admitExternalIdeaEvidence(fixture(), db),
    ).rejects.toMatchObject({ kind: "unauthorized" });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("derives ownership from the stored grant and rejects a signed wrong founder", async () => {
    const value = fixture();
    value.envelope.founder_id = "55555555-5555-4555-8555-555555555555";
    value.signature = sign(
      null,
      ideaEvidenceSignatureMessage(value.envelope),
      keys.privateKey,
    ).toString("base64");
    const db = fixtureDb(value);
    await expect(admitExternalIdeaEvidence(value, db)).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("rejects a signature made by another key", async () => {
    const value = fixture();
    const db = fixtureDb(value);
    value.signature = sign(
      null,
      ideaEvidenceSignatureMessage(value.envelope),
      generateKeyPairSync("ed25519").privateKey,
    ).toString("base64");
    await expect(admitExternalIdeaEvidence(value, db)).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("preserves original admission time for exact retries after prospective revocation", async () => {
    const value = fixture();
    value.sourceRow.revoked_at = now;
    value.grantRow.revoked_at = now;
    const admitted = await admitExternalIdeaEvidence(value, fixtureDb(value));
    expect(admitted.admitted_at).toBe(now);
  });
  it("maps a conflicting event replay to conflict without assuming successful persistence", async () => {
    const value = fixture();
    await expect(
      admitExternalIdeaEvidence(value, fixtureDb(value, null, "23505")),
    ).rejects.toMatchObject({ kind: "conflict" });
  });
  it("fails closed when admission returns a row but readback is empty", async () => {
    const value = fixture();
    const db = database(
      {
        cc_idea_evidence_sources: value.sourceRow,
        cc_idea_evidence_grants: value.grantRow,
      },
      value.event,
    );
    await expect(admitExternalIdeaEvidence(value, db)).rejects.toMatchObject({
      kind: "unavailable",
    });
  });
  it("requires enrollment readback to match its immutable canonical registration", async () => {
    const value = fixture();
    const db = database(
      {
        cc_idea_evidence_sources: {
          ...value.sourceRow,
          registration_hash: "d".repeat(64),
        },
      },
      value.sourceRow,
    );
    await expect(
      enrollIdeaEvidenceSource(value.source, db),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("requires revoked state to be confirmed after a revoke RPC", async () => {
    const value = fixture();
    const db = fixtureDb(value, value.grantRow);
    await expect(
      revokeIdeaEvidenceGrant(grantId, 1, "rotation", db),
    ).rejects.toMatchObject({ kind: "unavailable" });
    expect(db.rpc).toHaveBeenCalledWith("cc_idea_evidence_revoke_grant_v1", {
      p_grant_id: grantId,
      p_grant_version: 1,
      p_reason: "rotation",
    });
  });
  it("preserves history while excluding withdrawn evidence from projection", async () => {
    const value = fixture();
    const document = { withdrawal_of: eventId, reason: "compromised" };
    const withdrawal = {
      ...value.event,
      id: "66666666-6666-4666-8666-666666666666",
      event_id: "quarantine-1",
      record_kind: "withdrawal",
      withdrawal_of: eventId,
      envelope: document,
      canonical_envelope: canonicalEvidenceJson(document),
      payload_hash: hashIdeaEvidence(document),
    };
    const db = database(
      { cc_idea_evidence_events: [value.event, withdrawal] },
      null,
    );
    const result = await listTaskIdeaEvidence(founder, task, db);
    expect(result.active).toHaveLength(0);
    expect(result.history).toHaveLength(2);
  });
  it("rejects withdrawal readback that targets a different event", async () => {
    const value = fixture();
    const withdrawal = {
      ...value.event,
      record_kind: "withdrawal",
      withdrawal_of: task,
      event_id: "quarantine-1",
    };
    const db = database({ cc_idea_evidence_events: withdrawal }, withdrawal);
    await expect(
      withdrawIdeaEvidence(eventId, "quarantine-1", "compromised", db),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("routes builtin handoff through atomic persistence and confirms the current task on a historical retry", async () => {
    const value = fixture();
    const source: IdeaEvidenceSourceRegistration = {
      ...value.source,
      kind: "builtin_factory",
      event_kind: "reviewed_handoff_persisted",
      adapter_version: "factory_handoff_v1",
      public_key: null,
    };
    delete source.review_policy;
    const envelope: IdeaEvidenceEnvelope = {
      ...value.envelope,
      event_kind: "reviewed_handoff_persisted",
      payload: {
        adapter_version: "factory_handoff_v1",
        handoff_id: "handoff-1",
        handoff_digest: digest,
        persisted_metadata_digest: digest,
      },
    };
    const event = {
      ...value.event,
      envelope,
      signature: null,
      canonical_envelope: canonicalEvidenceJson(envelope),
      payload_hash: hashIdeaEvidence(envelope),
    };
    const currentTask = {
      id: task,
      founder_id: founder,
      metadata: {
        lifecycle: { revision: 4 },
        "external-note": { "é😀": 0.125 },
      },
    };
    const db = database(
      {
        cc_idea_evidence_sources: {
          ...value.sourceRow,
          registration: source,
          canonical_registration: canonicalEvidenceJson(source),
          registration_hash: hashIdeaEvidence(source),
        },
        cc_idea_evidence_grants: value.grantRow,
        cc_idea_evidence_events: event,
        cc_tasks: currentTask,
      },
      { event, task: currentTask },
    );
    const result = await persistReviewedHandoff(
      {
        envelope,
        expectedMetadata: {
          lifecycle: { revision: 3 },
          "external-note": { "é😀": 0.125 },
        },
        expectedUpdatedAt: now,
        expectedRevision: 3,
        nextLifecycle: { revision: 3, handoff: {} },
        handoff: {},
      },
      db,
    );
    expect(result.task.metadata).toEqual(currentTask.metadata);
    expect(db.rpc).toHaveBeenCalledWith(
      "cc_idea_evidence_persist_handoff_v1",
      expect.objectContaining({
        p_expected_revision: 3,
        p_verified_source_hash: hashIdeaEvidence(source),
      }),
    );
  });
});
