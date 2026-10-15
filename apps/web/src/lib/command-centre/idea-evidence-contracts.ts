import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const timestamp = z.string().datetime();
const repository = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const environment = z.enum(["staging", "production"]);
export const ideaEvidenceEventKindSchema = z.enum([
  "reviewed_handoff_persisted",
  "independent_review_verified",
  "production_journey_verified",
  "customer_value_achieved",
]);
const subjectSchema = z.object({ namespace: id, id }).strict();

/** These adapter policies are implemented producers, never caller-selected status labels. */
export const IDEA_EVIDENCE_ADAPTERS = {
  reviewed_handoff_persisted: "factory_handoff_v1",
  independent_review_verified: "nexus_release_gate_v1",
  production_journey_verified: "canonical_factory_journey_v1",
  customer_value_achieved: "product_value_action_v1",
} as const;

export const ideaEvidenceSourceRegistrationSchema = z
  .object({
    source_id: id,
    version: z.number().int().positive(),
    kind: z.enum(["builtin_factory", "ed25519"]),
    event_kind: ideaEvidenceEventKindSchema,
    adapter_version: id,
    repository,
    product_id: id,
    environment,
    review_policy: z
      .object({
        verifier_digest: digest,
        collector_policy_digest: digest,
        implementer_vendor: id.max(100),
      })
      .strict()
      .optional(),
    public_key: z
      .string()
      .regex(
        /^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PUBLIC KEY-----\r?\n?$/,
      )
      .max(4096)
      .nullable(),
  })
  .strict()
  .superRefine((source, ctx) => {
    if (
      (source.event_kind === "independent_review_verified") !==
      (source.review_policy !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Only review sources require an enrolled review policy",
      });
    }
    if (source.adapter_version !== IDEA_EVIDENCE_ADAPTERS[source.event_kind]) {
      ctx.addIssue({
        code: "custom",
        message: "Unsupported evidence adapter policy",
      });
    }
    const builtin = source.event_kind === "reviewed_handoff_persisted";
    if (
      builtin !== (source.kind === "builtin_factory") ||
      builtin !== (source.public_key === null)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Producer kind/key does not match the event",
      });
    }
    if (!builtin && source.public_key) {
      try {
        if (createPublicKey(source.public_key).asymmetricKeyType !== "ed25519")
          throw new Error("key type");
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "An Ed25519 public key is required",
        });
      }
    }
  });

export const ideaEvidenceStripeBindingSchema = z
  .object({
    account_id: z.string().regex(/^acct_[A-Za-z0-9]+$/),
    customer_id: z.string().regex(/^cus_[A-Za-z0-9]+$/),
    product_id: z.string().regex(/^prod_[A-Za-z0-9]+$/),
    verified_at: timestamp,
    association_ref: id,
    association_digest: digest,
  })
  .strict();

export const ideaEvidenceGrantSchema = z
  .object({
    grant_id: z.string().uuid(),
    version: z.number().int().positive(),
    source_id: id,
    source_version: z.number().int().positive(),
    founder_id: z.string().uuid(),
    task_id: z.string().uuid(),
    lifecycle_revision: z.number().int().positive(),
    brief_hash: digest,
    outcome_hash: digest.nullable(),
    outcome_canonical: z.string().min(1).max(100_000),
    repository,
    product_id: id,
    release_id: id,
    environment,
    subject: subjectSchema,
    event_name: id,
    contract_hash: digest,
    valid_from: timestamp,
    valid_until: timestamp,
    stripe_binding: ideaEvidenceStripeBindingSchema.nullable().optional(),
  })
  .strict()
  .superRefine((grant, ctx) => {
    if (Date.parse(grant.valid_until) <= Date.parse(grant.valid_from)) {
      ctx.addIssue({ code: "custom", message: "Grant interval must increase" });
    }
    try {
      const outcome: unknown = JSON.parse(grant.outcome_canonical);
      if (
        grant.outcome_hash === null
          ? outcome !== null || grant.outcome_canonical !== "null"
          : outcome === null ||
            createHash("sha256")
              .update(grant.outcome_canonical, "utf8")
              .digest("hex") !== grant.outcome_hash
      ) {
        throw new Error("Outcome binding");
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Outcome canonical JSON/hash mismatch",
      });
    }
  });

const reviewPayloadSchema = z
  .object({
    adapter_version: z.literal("nexus_release_gate_v1"),
    pull_request: z.number().int().positive(),
    base_sha: sha,
    head_sha: sha,
    receipt_digest: digest,
    report_digest: digest,
    mirror_digest: digest,
    execution_provenance_digest: digest,
    verifier_digest: digest,
    verifier_version: id,
    collector_policy_digest: digest,
    validation: z.literal("validated_non_exempt"),
    reviewer: z.object({ vendor: id, model: id, session_id: id }).strict(),
  })
  .strict();
const aliasSchema = z
  .object({ deployment_id: id, merge_sha: sha, observed_at: timestamp })
  .strict();
const journeyPayloadSchema = z
  .object({
    adapter_version: z.literal("canonical_factory_journey_v1"),
    canonical_origin: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          url.origin === value &&
          !url.username &&
          !url.password
        );
      }, "An HTTPS origin without path or credentials is required"),
    provider_project_id: id,
    provider_team_id: id,
    deployment_id: id,
    merge_sha: sha,
    journey_version: z.literal("factory_manual_research_v1"),
    authenticated_subject: subjectSchema,
    steps: z
      .array(
        z
          .object({
            sequence: z.number().int().positive(),
            action: id,
            action_ref: id,
            action_digest: digest,
            readback_ref: id,
            readback_digest: digest,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    recovery_ref: id,
    recovery_digest: digest,
    alias_start: aliasSchema,
    alias_end: aliasSchema,
  })
  .strict()
  .superRefine((payload, ctx) => {
    const actions = [
      "intake_persisted",
      "research_recorded",
      "brief_approved",
      "handoff_persisted",
      "recovery_readback",
    ];
    if (
      payload.steps.length !== actions.length ||
      payload.steps.some(
        (step, index) =>
          step.sequence !== index + 1 || step.action !== actions[index],
      ) ||
      payload.alias_start.deployment_id !== payload.deployment_id ||
      payload.alias_end.deployment_id !== payload.deployment_id ||
      payload.alias_start.merge_sha !== payload.merge_sha ||
      payload.alias_end.merge_sha !== payload.merge_sha ||
      Date.parse(payload.alias_end.observed_at) <
        Date.parse(payload.alias_start.observed_at)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Journey order or serving identity changed",
      });
    }
  });
const valuePayloadSchema = z
  .object({
    adapter_version: z.literal("product_value_action_v1"),
    action_name: id,
    durable_action_ref: id,
    durable_action_digest: digest,
    readback_ref: id,
    readback_digest: digest,
    stripe_binding: ideaEvidenceStripeBindingSchema,
  })
  .strict();
const handoffPayloadSchema = z
  .object({
    adapter_version: z.literal("factory_handoff_v1"),
    handoff_id: id,
    handoff_digest: digest,
    persisted_metadata_digest: digest,
  })
  .strict();

const envelopeShape = {
  source_id: id,
  source_version: z.number().int().positive(),
  grant_id: z.string().uuid(),
  grant_version: z.number().int().positive(),
  event_id: id,
  founder_id: z.string().uuid(),
  task_id: z.string().uuid(),
  lifecycle_revision: z.number().int().positive(),
  brief_hash: digest,
  outcome_hash: digest.nullable(),
  repository,
  product_id: id,
  release_id: id,
  environment,
  subject: subjectSchema,
  event_name: id,
  contract_hash: digest,
  occurred_at: timestamp,
};
export const ideaEvidenceEnvelopeSchema = z.discriminatedUnion("event_kind", [
  z
    .object({
      ...envelopeShape,
      event_kind: z.literal("reviewed_handoff_persisted"),
      payload: handoffPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...envelopeShape,
      event_kind: z.literal("independent_review_verified"),
      payload: reviewPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...envelopeShape,
      event_kind: z.literal("production_journey_verified"),
      payload: journeyPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...envelopeShape,
      event_kind: z.literal("customer_value_achieved"),
      payload: valuePayloadSchema,
    })
    .strict(),
]);

export type IdeaEvidenceSourceRegistration = z.infer<
  typeof ideaEvidenceSourceRegistrationSchema
>;
export type IdeaEvidenceGrant = z.infer<typeof ideaEvidenceGrantSchema>;
export type IdeaEvidenceEnvelope = z.infer<typeof ideaEvidenceEnvelopeSchema>;
export type IdeaEvidenceSourceRow = {
  registration: unknown;
  registration_hash: string;
};
export type IdeaEvidenceGrantRow = {
  registration: unknown;
  registration_hash: string;
};

/** Evidence protocol v1: ASCII keys in lexical order, JSON scalars, ordered arrays, UTF-8.
 * This deliberately avoids localeCompare and JSON.stringify's integer-key reordering.
 * Existing lifecycle outcome_canonical retains its original hash algorithm as an opaque string.
 */
export function canonicalEvidenceJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value))
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(canonicalEvidenceJson).join(",")}]`;
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    if (entries.some(([key]) => !/^[A-Za-z0-9_]+$/.test(key)))
      throw new Error("Evidence keys must be ASCII identifiers");
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalEvidenceJson(item)}`).join(",")}}`;
  }
  throw new Error("Evidence must contain only JSON values and safe integers");
}
export function hashIdeaEvidence(value: unknown): string {
  return createHash("sha256")
    .update(canonicalEvidenceJson(value), "utf8")
    .digest("hex");
}

/** Opaque persisted artifacts retain arbitrary JSON keys and finite numeric values.
 * Key ordering uses JS lexical comparison, without locale or integer-key reordering.
 * This is not the fixed-field evidence protocol or the legacy outcome hash format.
 */
export function canonicalArtifactJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${Array.from(value, canonicalArtifactJson).join(",")}]`;
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalArtifactJson(item)}`).join(",")}}`;
  }
  throw new Error("Artifacts must contain only JSON values and finite numbers");
}
export function hashEvidenceArtifact(value: unknown): string {
  return createHash("sha256")
    .update(canonicalArtifactJson(value), "utf8")
    .digest("hex");
}
export const IDEA_EVIDENCE_SIGNATURE_DOMAIN = "unite-group:idea-evidence:v1:";
export function ideaEvidenceSignatureMessage(
  envelope: IdeaEvidenceEnvelope,
): Buffer {
  return Buffer.from(
    IDEA_EVIDENCE_SIGNATURE_DOMAIN + canonicalEvidenceJson(envelope),
    "utf8",
  );
}

/** Rows MUST come from service-owned enrollment storage, never from the upload body.
 * This verifies identity/scope/signature only. The atomic SQL admission operation owns
 * expiry/revocation, DB-clock freshness and exact historical retries (without freshening).
 */
export function verifyExternalIdeaEvidence(input: {
  envelope: unknown;
  signature: string;
  source: IdeaEvidenceSourceRow;
  grant: IdeaEvidenceGrantRow;
  expected: { founder_id: string; task_id: string };
}): {
  envelope: IdeaEvidenceEnvelope;
  envelope_hash: string;
  source: IdeaEvidenceSourceRegistration;
  grant: IdeaEvidenceGrant;
} {
  const envelope = ideaEvidenceEnvelopeSchema.parse(input.envelope);
  const source = ideaEvidenceSourceRegistrationSchema.parse(
    input.source.registration,
  );
  const grant = ideaEvidenceGrantSchema.parse(input.grant.registration);
  if (
    hashIdeaEvidence(source) !== input.source.registration_hash ||
    hashIdeaEvidence(grant) !== input.grant.registration_hash
  ) {
    throw new Error("Enrolled registration hash mismatch");
  }
  if (
    source.kind !== "ed25519" ||
    envelope.event_kind === "reviewed_handoff_persisted"
  )
    throw new Error("Built-in evidence requires the atomic server action");
  if (
    source.source_id !== envelope.source_id ||
    source.version !== envelope.source_version ||
    source.event_kind !== envelope.event_kind ||
    grant.source_id !== source.source_id ||
    grant.source_version !== source.version ||
    grant.grant_id !== envelope.grant_id ||
    grant.version !== envelope.grant_version ||
    envelope.founder_id !== input.expected.founder_id ||
    envelope.task_id !== input.expected.task_id
  )
    throw new Error("Evidence issuer or owner mismatch");
  const scopeKeys = [
    "founder_id",
    "task_id",
    "lifecycle_revision",
    "brief_hash",
    "outcome_hash",
    "repository",
    "product_id",
    "release_id",
    "environment",
    "subject",
    "event_name",
    "contract_hash",
  ] as const;
  if (
    scopeKeys.some(
      (key) =>
        canonicalEvidenceJson(envelope[key]) !==
        canonicalEvidenceJson(grant[key]),
    ) ||
    source.repository !== envelope.repository ||
    source.product_id !== envelope.product_id ||
    source.environment !== envelope.environment
  )
    throw new Error("Evidence grant scope mismatch");
  if (envelope.event_kind === "independent_review_verified") {
    if (envelope.payload.head_sha !== envelope.release_id)
      throw new Error("Review release must be its exact head SHA");
    const policy = source.review_policy;
    if (
      !policy ||
      envelope.payload.verifier_digest !== policy.verifier_digest ||
      envelope.payload.collector_policy_digest !==
        policy.collector_policy_digest ||
      envelope.payload.reviewer.vendor.toLowerCase() ===
        policy.implementer_vendor.toLowerCase()
    ) {
      throw new Error(
        "Review does not match the enrolled independent review policy",
      );
    }
  }
  if (
    envelope.event_kind === "production_journey_verified" &&
    (envelope.payload.deployment_id !== envelope.release_id ||
      hashIdeaEvidence(envelope.payload.authenticated_subject) !==
        hashIdeaEvidence(envelope.subject))
  )
    throw new Error("Journey release or authenticated subject mismatch");
  if (
    envelope.event_kind === "customer_value_achieved" &&
    (!grant.stripe_binding ||
      envelope.subject.namespace !== "stripe_customer" ||
      envelope.subject.id !== grant.stripe_binding.customer_id ||
      envelope.payload.action_name !== envelope.event_name ||
      /(^|[_.:/-])(registered|registration|invited|invitation|email|signup|activated)([_.:/-]|$)/i.test(
        envelope.event_name,
      ) ||
      hashIdeaEvidence(envelope.payload.stripe_binding) !==
        hashIdeaEvidence(grant.stripe_binding))
  )
    throw new Error("Value action or verified customer binding mismatch");
  if (!/^[A-Za-z0-9+/]{86}==$/.test(input.signature))
    throw new Error("Canonical Ed25519 signature required");
  const signature = Buffer.from(input.signature, "base64");
  if (
    signature.length !== 64 ||
    signature.toString("base64") !== input.signature ||
    !verify(
      null,
      ideaEvidenceSignatureMessage(envelope),
      createPublicKey(source.public_key!),
      signature,
    )
  )
    throw new Error("Invalid evidence signature");
  return { envelope, envelope_hash: hashIdeaEvidence(envelope), source, grant };
}
