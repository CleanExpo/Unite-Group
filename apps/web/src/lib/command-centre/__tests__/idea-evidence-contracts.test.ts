import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalEvidenceJson,
  canonicalArtifactJson,
  hashEvidenceArtifact,
  hashIdeaEvidence,
  ideaEvidenceEnvelopeSchema,
  ideaEvidenceGrantSchema,
  ideaEvidenceSignatureMessage,
  ideaEvidenceSourceRegistrationSchema,
  verifyExternalIdeaEvidence,
  type IdeaEvidenceEnvelope,
  type IdeaEvidenceGrant,
  type IdeaEvidenceSourceRegistration,
} from "../idea-evidence-contracts";

const keys = generateKeyPairSync("ed25519");
const publicKey = keys.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const digest = "a".repeat(64);
const head = "b".repeat(40);
const founder = "11111111-1111-4111-8111-111111111111";
const task = "22222222-2222-4222-8222-222222222222";
const now = "2026-10-16T01:00:00.000Z";
function fixture(): {
  source: IdeaEvidenceSourceRegistration;
  grant: IdeaEvidenceGrant;
  envelope: IdeaEvidenceEnvelope;
} {
  const source: IdeaEvidenceSourceRegistration = {
    source_id: "mac-review",
    version: 1,
    kind: "ed25519",
    event_kind: "independent_review_verified",
    adapter_version: "nexus_release_gate_v1",
    repository: "CleanExpo/Unite-Group",
    product_id: "factory",
    environment: "production",
    public_key: publicKey,
    review_policy: {
      verifier_digest: digest,
      collector_policy_digest: digest,
      implementer_vendor: "openai",
    },
  };
  const grant: IdeaEvidenceGrant = {
    grant_id: "33333333-3333-4333-8333-333333333333",
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
    release_id: head,
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
    source_version: source.version,
    grant_id: grant.grant_id,
    grant_version: grant.version,
    event_id: "review-1",
    event_kind: "independent_review_verified",
    founder_id: founder,
    task_id: task,
    lifecycle_revision: grant.lifecycle_revision,
    brief_hash: digest,
    outcome_hash: null,
    repository: source.repository,
    product_id: source.product_id,
    release_id: head,
    environment: "production",
    subject: grant.subject,
    event_name: grant.event_name,
    contract_hash: digest,
    occurred_at: now,
    payload: {
      adapter_version: "nexus_release_gate_v1",
      pull_request: 1188,
      base_sha: "c".repeat(40),
      head_sha: head,
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
  return { source, grant, envelope };
}
function verifyFixture(value = fixture(), signature?: string) {
  return verifyExternalIdeaEvidence({
    source: {
      registration: value.source,
      registration_hash: hashIdeaEvidence(value.source),
    },
    grant: {
      registration: value.grant,
      registration_hash: hashIdeaEvidence(value.grant),
    },
    envelope: value.envelope,
    signature:
      signature ??
      sign(
        null,
        ideaEvidenceSignatureMessage(value.envelope),
        keys.privateKey,
      ).toString("base64"),
    expected: { founder_id: founder, task_id: task },
  });
}

describe("authenticated idea evidence contracts", () => {
  it("verifies a full non-exempt review bound to its enrolled source and exact head", () => {
    const result = verifyFixture();
    expect(result.envelope_hash).toBe(hashIdeaEvidence(fixture().envelope));
  });
  it("hashes ordered ASCII JSON as exact UTF-8 bytes while preserving non-ASCII values", () => {
    const canonical = '{"10":"é😀","2":3,"nested":{"a":true,"z":null}}';
    const value = { nested: { z: null, a: true }, "2": 3, "10": "é😀" };
    expect(canonicalEvidenceJson(value)).toBe(canonical);
    expect(hashIdeaEvidence(value)).toBe(
      createHash("sha256").update(Buffer.from(canonical, "utf8")).digest("hex"),
    );
  });
  it.each([
    undefined,
    NaN,
    Infinity,
    0.5,
    new Date(),
    { a: undefined },
    { é: 1 },
  ])("rejects non-protocol canonical input %j", (value) => {
    expect(() => canonicalEvidenceJson(value)).toThrow();
  });
  it("preserves existing metadata answer keys and fractional metrics in artifact hashes", () => {
    const metadata = {
      delivery: { answers: { "question-id": "restoration", "é😀": 0.125 } },
      metrics: { ratio: -1.25 },
    };
    const canonical =
      '{"delivery":{"answers":{"question-id":"restoration","é😀":0.125}},"metrics":{"ratio":-1.25}}';
    expect(canonicalArtifactJson(metadata)).toBe(canonical);
    expect(hashEvidenceArtifact(metadata)).toBe(
      createHash("sha256").update(canonical, "utf8").digest("hex"),
    );
    expect(() => canonicalEvidenceJson(metadata)).toThrow();
    expect(
      ideaEvidenceEnvelopeSchema.safeParse({
        ...fixture().envelope,
        "question-id": "extra",
      }).success,
    ).toBe(false);
  });
  it.each([
    NaN,
    Infinity,
    undefined,
    { nested: undefined },
    [undefined],
    new Array(1),
  ])("rejects non-JSON artifact input %j", (value) => {
    expect(() => canonicalArtifactJson(value)).toThrow();
  });
  it.each([
    ["source_id", "other-source"],
    ["source_version", 2],
    ["grant_version", 2],
    ["grant_id", "44444444-4444-4444-8444-444444444444"],
    ["founder_id", "44444444-4444-4444-8444-444444444444"],
    ["task_id", "44444444-4444-4444-8444-444444444444"],
    ["lifecycle_revision", 4],
    ["brief_hash", "d".repeat(64)],
    ["outcome_hash", digest],
    ["repository", "Other/Repository"],
    ["product_id", "other-product"],
    ["release_id", "d".repeat(40)],
    ["environment", "staging"],
    ["subject", { namespace: "operator", id: "other" }],
    ["event_name", "other-event"],
    ["contract_hash", "d".repeat(64)],
  ] as const)(
    "rejects a validly signed envelope transplanted to %s",
    (field, value) => {
      const candidate = fixture();
      Object.assign(candidate.envelope, { [field]: value });
      expect(() => verifyFixture(candidate)).toThrow();
    },
  );
  it("does not accept a source registration or grant hash substituted by an upload", () => {
    const value = fixture();
    const signature = sign(
      null,
      ideaEvidenceSignatureMessage(value.envelope),
      keys.privateKey,
    ).toString("base64");
    const input = {
      source: { registration: value.source, registration_hash: digest },
      grant: {
        registration: value.grant,
        registration_hash: hashIdeaEvidence(value.grant),
      },
      envelope: value.envelope,
      signature,
      expected: { founder_id: founder, task_id: task },
    };
    expect(() => verifyExternalIdeaEvidence(input)).toThrow(
      "registration hash",
    );
    input.source.registration_hash = hashIdeaEvidence(value.source);
    input.grant.registration_hash = digest;
    expect(() => verifyExternalIdeaEvidence(input)).toThrow(
      "registration hash",
    );
  });
  it("rejects a signature under another key and an unsigned or noncanonical signature", () => {
    const value = fixture();
    const wrong = generateKeyPairSync("ed25519");
    expect(() =>
      verifyFixture(
        value,
        sign(
          null,
          ideaEvidenceSignatureMessage(value.envelope),
          wrong.privateKey,
        ).toString("base64"),
      ),
    ).toThrow("signature");
    expect(() => verifyFixture(value, "")).toThrow("signature");
    expect(() => verifyFixture(value, "A".repeat(86) + "==\n")).toThrow(
      "signature",
    );
  });
  it("binds the entire payload and domain, including provider provenance", () => {
    const value = fixture();
    const signature = sign(
      null,
      ideaEvidenceSignatureMessage(value.envelope),
      keys.privateKey,
    ).toString("base64");
    if (value.envelope.event_kind !== "independent_review_verified")
      throw new Error("fixture");
    value.envelope.payload.execution_provenance_digest = "d".repeat(64);
    expect(() => verifyFixture(value, signature)).toThrow("signature");
    const naked = sign(
      null,
      Buffer.from(canonicalEvidenceJson(value.envelope)),
      keys.privateKey,
    ).toString("base64");
    expect(() => verifyFixture(value, naked)).toThrow("signature");
  });
  it("rejects a review for another head even when the trusted scope is unchanged", () => {
    const value = fixture();
    if (value.envelope.event_kind !== "independent_review_verified")
      throw new Error("fixture");
    value.envelope.payload.head_sha = "d".repeat(40);
    expect(() => verifyFixture(value)).toThrow("exact head");
  });
  it("rejects generic pass flags, exemption and missing execution provenance", () => {
    const { envelope } = fixture();
    expect(
      ideaEvidenceEnvelopeSchema.safeParse({
        ...envelope,
        payload: { passed: true },
      }).success,
    ).toBe(false);
    expect(
      ideaEvidenceEnvelopeSchema.safeParse({
        ...envelope,
        payload: { ...envelope.payload, validation: "exempt" },
      }).success,
    ).toBe(false);
    expect(
      ideaEvidenceEnvelopeSchema.safeParse({
        ...envelope,
        payload: {
          ...envelope.payload,
          execution_provenance_digest: undefined,
        },
      }).success,
    ).toBe(false);
  });
  it("rejects an unknown adapter and a non-Ed25519 public key", () => {
    const { source } = fixture();
    expect(
      ideaEvidenceSourceRegistrationSchema.safeParse({
        ...source,
        adapter_version: "signed_boolean_v1",
      }).success,
    ).toBe(false);
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(
      ideaEvidenceSourceRegistrationSchema.safeParse({
        ...source,
        public_key: rsa.publicKey
          .export({ type: "spki", format: "pem" })
          .toString(),
      }).success,
    ).toBe(false);
  });
  it("requires independently enrolled policy pins only for review sources", () => {
    const { source } = fixture();
    const { review_policy, ...withoutPolicy } = source;
    expect(
      ideaEvidenceSourceRegistrationSchema.safeParse(withoutPolicy).success,
    ).toBe(false);
    expect(
      ideaEvidenceSourceRegistrationSchema.safeParse({
        ...source,
        review_policy: null,
      }).success,
    ).toBe(false);
    expect(
      ideaEvidenceSourceRegistrationSchema.safeParse({
        ...withoutPolicy,
        event_kind: "production_journey_verified",
        adapter_version: "canonical_factory_journey_v1",
        review_policy,
      }).success,
    ).toBe(false);
  });
  it.each([
    "verifier_digest",
    "collector_policy_digest",
    "implementer_vendor",
  ] as const)("rejects a review against the wrong enrolled %s", (field) => {
    const value = fixture();
    if (!value.source.review_policy) throw new Error("fixture");
    value.source.review_policy[field] =
      field === "implementer_vendor" ? "MiniMax" : "d".repeat(64);
    expect(() => verifyFixture(value)).toThrow("independent review policy");
  });
  it("never admits the built-in handoff producer through external signature verification", () => {
    const value = fixture();
    value.source = {
      ...value.source,
      kind: "builtin_factory",
      event_kind: "reviewed_handoff_persisted",
      adapter_version: "factory_handoff_v1",
      public_key: null,
    };
    delete value.source.review_policy;
    value.envelope = {
      ...value.envelope,
      event_kind: "reviewed_handoff_persisted",
      payload: {
        adapter_version: "factory_handoff_v1",
        handoff_id: "handoff-1",
        handoff_digest: digest,
        persisted_metadata_digest: digest,
      },
    };
    expect(() => verifyFixture(value)).toThrow("atomic server action");
  });
  it("validates the immutable outcome hash and rejects an inverted authority interval", () => {
    const { grant } = fixture();
    expect(
      ideaEvidenceGrantSchema.safeParse({
        ...grant,
        outcome_canonical: '{"productId":"other"}',
      }).success,
    ).toBe(false);
    expect(
      ideaEvidenceGrantSchema.safeParse({ ...grant, outcome_hash: digest })
        .success,
    ).toBe(false);
    expect(
      ideaEvidenceGrantSchema.safeParse({
        ...grant,
        valid_until: grant.valid_from,
      }).success,
    ).toBe(false);
  });
  it("leaves historical expiry and prospective revocation to atomic admission without freshening evidence", () => {
    const value = fixture();
    value.grant.valid_until = "2026-10-15T01:00:00.000Z";
    const verified = verifyFixture(value);
    expect(verified.envelope.occurred_at).toBe(now);
  });
  it("requires the complete ordered authenticated journey and unchanged canonical serving identity", () => {
    const value = fixture();
    value.source = {
      ...value.source,
      event_kind: "production_journey_verified",
      adapter_version: "canonical_factory_journey_v1",
    };
    delete value.source.review_policy;
    value.grant.release_id = "dpl_live";
    value.envelope = {
      ...value.envelope,
      release_id: "dpl_live",
      event_kind: "production_journey_verified",
      payload: {
        adapter_version: "canonical_factory_journey_v1",
        canonical_origin: "https://unite-group.in",
        provider_project_id: "prj_factory",
        provider_team_id: "team_factory",
        deployment_id: "dpl_live",
        merge_sha: head,
        journey_version: "factory_manual_research_v1",
        authenticated_subject: value.grant.subject,
        steps: [
          "intake_persisted",
          "research_recorded",
          "brief_approved",
          "handoff_persisted",
          "recovery_readback",
        ].map((action, index) => ({
          sequence: index + 1,
          action,
          action_ref: `action-${index}`,
          action_digest: digest,
          readback_ref: `read-${index}`,
          readback_digest: digest,
        })),
        recovery_ref: "retained-task-1",
        recovery_digest: digest,
        alias_start: {
          deployment_id: "dpl_live",
          merge_sha: head,
          observed_at: now,
        },
        alias_end: {
          deployment_id: "dpl_live",
          merge_sha: head,
          observed_at: now,
        },
      },
    };
    expect(verifyFixture(value).envelope.release_id).toBe("dpl_live");
    if (value.envelope.event_kind !== "production_journey_verified")
      throw new Error("fixture");
    value.envelope.payload.alias_end.deployment_id = "dpl_other";
    expect(() => verifyFixture(value)).toThrow();
    value.envelope.payload.alias_end.deployment_id = "dpl_live";
    value.envelope.payload.steps.pop();
    expect(() => verifyFixture(value)).toThrow();
  });
  it("requires a durable value action for the exact verified Stripe customer association", () => {
    const value = fixture();
    const binding = {
      account_id: "acct_offer",
      customer_id: "cus_buyer",
      product_id: "prod_offer",
      verified_at: now,
      association_ref: "billing-association-1",
      association_digest: digest,
    };
    value.source = {
      ...value.source,
      event_kind: "customer_value_achieved",
      adapter_version: "product_value_action_v1",
    };
    delete value.source.review_policy;
    value.grant = {
      ...value.grant,
      subject: { namespace: "stripe_customer", id: "cus_buyer" },
      event_name: "report_delivered",
      stripe_binding: binding,
    };
    value.envelope = {
      ...value.envelope,
      subject: value.grant.subject,
      event_name: value.grant.event_name,
      event_kind: "customer_value_achieved",
      payload: {
        adapter_version: "product_value_action_v1",
        action_name: "report_delivered",
        durable_action_ref: "delivered-report-1",
        durable_action_digest: digest,
        readback_ref: "report-1",
        readback_digest: digest,
        stripe_binding: binding,
      },
    };
    expect(verifyFixture(value).grant.stripe_binding?.customer_id).toBe(
      "cus_buyer",
    );
    if (value.envelope.event_kind !== "customer_value_achieved")
      throw new Error("fixture");
    value.envelope.payload.stripe_binding = {
      ...binding,
      account_id: "acct_other",
    };
    expect(() => verifyFixture(value)).toThrow("customer binding");
    value.envelope.payload.stripe_binding = binding;
    value.envelope.payload.action_name =
      value.envelope.event_name =
      value.grant.event_name =
        "registration";
    expect(() => verifyFixture(value)).toThrow("Value action");
  });
});
