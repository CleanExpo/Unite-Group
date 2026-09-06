import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const CONTROL_PLANE_REGISTRY_SCHEMA =
  "nexus.portfolio.control-plane.registry.v1" as const;
export const REPOSITORY_OBSERVATION_SCHEMA =
  "nexus.portfolio.repository-observation.v1" as const;
export const WORKTREE_BINDING_SCHEMA =
  "nexus.portfolio.worktree-binding.v1" as const;
export const DEVICE_HEARTBEAT_SCHEMA =
  "nexus.portfolio.device-heartbeat.v1" as const;
export const DEVICE_ENROLMENT_SCHEMA =
  "nexus.portfolio.device-enrolment.v1" as const;
export const DEVICE_CHECKPOINT_SCHEMA =
  "nexus.portfolio.device-checkpoint.v1" as const;
export const EXECUTION_LEASE_SCHEMA =
  "nexus.portfolio.execution-lease.v1" as const;
export const DURABLE_JOB_SCHEMA = "nexus.portfolio.durable-job.v1" as const;
export const PORTFOLIO_BASELINE_SCHEMA =
  "nexus.portfolio.freeze-baseline.v1" as const;
export const PORTFOLIO_MANIFEST_SCHEMA =
  "nexus.portfolio.drift-manifest.v1" as const;
export const PORTFOLIO_PROJECTION_SCHEMA =
  "nexus.portfolio.control-plane.projection.v1" as const;

const SHA256 = /^[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40,64}$/;
const EXPLICIT_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const Id = z.string().trim().min(1).max(200);
const Sha256 = z.string().regex(SHA256);
const GitSha = z.string().regex(GIT_SHA);
const Timestamp = z
  .string()
  .refine(
    (value) =>
      EXPLICIT_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value)),
    "explicit ISO timestamp required",
  );

export const PortfolioControlPlaneRegistrySchema = z
  .object({
    schema: z.literal(CONTROL_PLANE_REGISTRY_SCHEMA),
    registryId: Id,
    registryVersion: Id,
    issuedAt: Timestamp,
    controlPlaneAttestationKeyRef: z.literal(
      "NEXUS_CONTROL_PLANE_ATTESTATION_KEY",
    ),
    precedence: z
      .object({
        authority: z.literal(".portfolio/CONTROL-PLANE.v1.json"),
        scope: Id,
        rule: Id,
      })
      .strict(),
    freshness: z
      .object({
        fetchFreshForMs: z.number().int().positive(),
        evidenceFreshForMs: z.number().int().positive(),
        heartbeatFreshForMs: z.number().int().positive(),
        heartbeatStaleAfterMs: z.number().int().positive(),
        leaseMaximumMs: z.number().int().positive(),
      })
      .strict()
      .superRefine((value, context) => {
        if (value.heartbeatStaleAfterMs <= value.heartbeatFreshForMs) {
          context.addIssue({
            code: "custom",
            message: "stale boundary must exceed fresh boundary",
          });
        }
      }),
    modelCapabilities: z.array(
      z
        .object({
          capabilityId: Id,
          provider: Id,
          officialName: Id,
          modelId: Id,
          officialSource: z.string().url(),
          state: z.literal("unverified"),
          effectiveRuntimeProbe: z.null(),
          entitlement: z.literal("unverified"),
          cost: z.literal("unverified"),
          quota: z.literal("unverified"),
        })
        .strict(),
    ),
    repositories: z
      .array(
        z
          .object({
            projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
            repositoryId: z
              .string()
              .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
            defaultBranch: Id,
            controlPlaneRole: z.enum([
              "mission_control",
              "delivery_runtime",
              "portfolio_product",
              "client_product",
            ]),
            allowedWorktreeRoles: z
              .array(
                z.enum(["canonical_root", "isolated_worktree", "audit_clone"]),
              )
              .min(1),
            allowedEvidenceSources: z
              .array(
                z.enum([
                  "local_git_readback",
                  "signed_device_attestation",
                  "independent_exact_sha_review",
                ]),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
    devices: z
      .array(
        z
          .object({
            deviceId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
            label: Id,
            platform: z.enum(["darwin", "windows", "linux"]),
            attestationKeyRef: z
              .string()
              .regex(/^NEXUS_DEVICE_ATTESTATION_KEY_[A-Z0-9_]+$/),
            allowedHarnesses: z.array(Id).min(1),
            heartbeatAdapters: z.array(
              z
                .object({
                  adapterId: Id,
                  state: z.literal("unverified"),
                  evidenceScope: z.literal("diagnostic_only"),
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const projectIds = new Set<string>();
    const repositoryIds = new Set<string>();
    for (const [index, repository] of value.repositories.entries()) {
      if (projectIds.has(repository.projectId))
        context.addIssue({
          code: "custom",
          path: ["repositories", index, "projectId"],
          message: "duplicate projectId",
        });
      if (repositoryIds.has(repository.repositoryId.toLowerCase()))
        context.addIssue({
          code: "custom",
          path: ["repositories", index, "repositoryId"],
          message: "duplicate repositoryId",
        });
      projectIds.add(repository.projectId);
      repositoryIds.add(repository.repositoryId.toLowerCase());
    }
    const devices = new Set<string>();
    for (const [index, device] of value.devices.entries()) {
      if (devices.has(device.deviceId))
        context.addIssue({
          code: "custom",
          path: ["devices", index, "deviceId"],
          message: "duplicate deviceId",
        });
      devices.add(device.deviceId);
    }
  });

export type PortfolioControlPlaneRegistry = z.infer<
  typeof PortfolioControlPlaneRegistrySchema
>;
export type RegisteredRepository =
  PortfolioControlPlaneRegistry["repositories"][number];
export type RegisteredDevice = PortfolioControlPlaneRegistry["devices"][number];

const RepositoryObservationPayloadSchema = z
  .object({
    schema: z.literal(REPOSITORY_OBSERVATION_SCHEMA),
    observationId: Id,
    registryVersion: Id,
    projectId: Id,
    repositoryId: Id,
    deviceId: Id,
    observedAt: Timestamp,
    collector: z
      .object({ id: Id, version: Id, source: z.literal("local_git_readback") })
      .strict(),
    worktree: z
      .object({
        worktreeId: Sha256,
        pathHash: Sha256,
        path: Id,
        role: z.enum(["canonical_root", "isolated_worktree", "audit_clone"]),
        branch: z.string().min(1).nullable(),
        detached: z.boolean(),
      })
      .strict(),
    baseRevision: GitSha.nullable(),
    observedRevision: GitSha,
    upstream: z
      .object({
        ref: z.string().min(1).nullable(),
        revision: GitSha.nullable(),
        fetchedAt: Timestamp.nullable(),
        freshness: z.enum(["fresh", "stale", "missing", "unproven"]),
        ahead: z.number().int().nonnegative().nullable(),
        behind: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    workingTree: z
      .object({
        classification: z.enum([
          "clean",
          "tracked_changes",
          "untracked_only",
          "mixed",
          "conflicted",
          "unproven",
        ]),
        staged: z.array(Id),
        unstaged: z.array(Id),
        untracked: z.array(Id),
        conflicted: z.array(Id),
      })
      .strict(),
    generatedResidue: z
      .object({
        classification: z.enum(["none", "known_generated", "mixed_or_unknown"]),
        paths: z.array(Id),
      })
      .strict(),
    declaredOwner: z
      .object({
        bindingId: z.string().min(1).nullable(),
        ownerId: z.string().min(1).nullable(),
        leaseId: z.string().min(1).nullable(),
        state: z.enum([
          "unclaimed",
          "declared",
          "leased",
          "conflicting",
          "unknown",
        ]),
      })
      .strict(),
    contentManifestHash: Sha256,
  })
  .strict();

export type RepositoryObservationPayload = z.infer<
  typeof RepositoryObservationPayloadSchema
>;

const WorktreeBindingPayloadSchema = z
  .object({
    schema: z.literal(WORKTREE_BINDING_SCHEMA),
    bindingId: Id,
    registryVersion: Id,
    projectId: Id,
    repositoryId: Id,
    deviceId: Id,
    worktreeId: Sha256,
    pathHash: Sha256,
    role: z.enum(["canonical_root", "isolated_worktree", "audit_clone"]),
    ownerId: Id,
    issuedAt: Timestamp,
    expiresAt: Timestamp,
  })
  .strict();

export type WorktreeBindingPayload = z.infer<
  typeof WorktreeBindingPayloadSchema
>;

const DeviceHeartbeatPayloadSchema = z
  .object({
    schema: z.literal(DEVICE_HEARTBEAT_SCHEMA),
    heartbeatId: Id,
    registryVersion: Id,
    deviceId: Id,
    sequence: z.number().int().nonnegative(),
    observedAt: Timestamp,
    expiresAt: Timestamp,
    worker: z
      .object({
        workerId: Id,
        modelProvider: Id,
        modelId: Id,
        harness: Id,
        harnessVersion: Id,
      })
      .strict(),
    source: z
      .object({
        adapterId: Id,
        adapterVersion: Id,
        kind: z.enum(["device_runtime", "pi_dev_ops_mesh_heartbeat_adapter"]),
        identityBinding: z.enum(["device_attestation", "unverified_transport"]),
      })
      .strict(),
    activeJobId: z.string().min(1).nullable(),
    lastCheckpointId: z.string().min(1).nullable(),
  })
  .strict();

export type DeviceHeartbeatPayload = z.infer<
  typeof DeviceHeartbeatPayloadSchema
>;

const DeviceEnrolmentPayloadSchema = z
  .object({
    schema: z.literal(DEVICE_ENROLMENT_SCHEMA),
    enrolmentId: Id,
    registryVersion: Id,
    deviceId: Id,
    workerId: Id,
    harness: Id,
    harnessVersion: Id,
    issuedAt: Timestamp,
    expiresAt: Timestamp,
    state: z.literal("enrolled"),
  })
  .strict();

export type DeviceEnrolmentPayload = z.infer<
  typeof DeviceEnrolmentPayloadSchema
>;

const ExecutionLeasePayloadSchema = z
  .object({
    schema: z.literal(EXECUTION_LEASE_SCHEMA),
    leaseId: Id,
    registryVersion: Id,
    jobId: Id,
    deviceId: Id,
    workerId: Id,
    acquiredAt: Timestamp,
    expiresAt: Timestamp,
    fencingToken: z.number().int().positive(),
  })
  .strict();

export type ExecutionLeasePayload = z.infer<typeof ExecutionLeasePayloadSchema>;

const DeviceCheckpointPayloadSchema = z
  .object({
    schema: z.literal(DEVICE_CHECKPOINT_SCHEMA),
    checkpointId: Id,
    registryVersion: Id,
    jobId: Id,
    deviceId: Id,
    workerId: Id,
    leaseId: Id,
    fencingToken: z.number().int().positive(),
    recordedAt: Timestamp,
    stage: Id,
    currentWork: Id,
    evidenceRefs: z.array(Id),
    nextAction: Id,
  })
  .strict();

export type DeviceCheckpointPayload = z.infer<
  typeof DeviceCheckpointPayloadSchema
>;

const DurableJobPayloadSchema = z
  .object({
    schema: z.literal(DURABLE_JOB_SCHEMA),
    jobId: Id,
    registryVersion: Id,
    projectId: Id,
    objective: Id,
    state: z.enum([
      "queued",
      "running",
      "blocked_recoverable",
      "approval_pending",
      "paused_offline",
      "verified_local",
    ]),
    assignedDeviceId: z.string().min(1).nullable(),
    assignedWorkerId: z.string().min(1).nullable(),
    leaseId: z.string().min(1).nullable(),
    checkpointId: z.string().min(1).nullable(),
    latestEvidenceRefs: z.array(Id),
    blocker: z.string().min(1).nullable(),
    nextAction: Id,
    updatedAt: Timestamp,
  })
  .strict();

export type DurableJobPayload = z.infer<typeof DurableJobPayloadSchema>;

const BaselineEvidenceSchema = z
  .object({
    repositoryObservationHashes: z.array(Sha256),
    worktreeBindingHashes: z.array(Sha256),
    deviceEnrolmentHashes: z.array(Sha256),
    deviceHeartbeatHashes: z.array(Sha256),
    leaseHashes: z.array(Sha256),
    checkpointHashes: z.array(Sha256),
    jobHashes: z.array(Sha256),
  })
  .strict();

const PortfolioBaselinePayloadSchema = z
  .object({
    schema: z.literal(PORTFOLIO_BASELINE_SCHEMA),
    baselineId: Id,
    registryVersion: Id,
    state: z.literal("in_progress"),
    recordedAt: Timestamp,
    evidence: BaselineEvidenceSchema,
    evidenceSnapshotHash: Sha256,
  })
  .strict();

export type BaselineEvidence = z.infer<typeof BaselineEvidenceSchema>;
export type PortfolioBaselinePayload = z.infer<
  typeof PortfolioBaselinePayloadSchema
>;

const AttestationSignatureSchema = z
  .object({
    algorithm: z.literal("hmac-sha256"),
    signerId: Id,
    recordHash: Sha256,
    value: Sha256,
  })
  .strict();

export interface SignedEnvelope<T> {
  payload: T;
  signature: z.infer<typeof AttestationSignatureSchema>;
}

const SignedRepositoryObservationSchema = z
  .object({
    payload: RepositoryObservationPayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedWorktreeBindingSchema = z
  .object({
    payload: WorktreeBindingPayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedDeviceHeartbeatSchema = z
  .object({
    payload: DeviceHeartbeatPayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedDeviceEnrolmentSchema = z
  .object({
    payload: DeviceEnrolmentPayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedExecutionLeaseSchema = z
  .object({
    payload: ExecutionLeasePayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedDeviceCheckpointSchema = z
  .object({
    payload: DeviceCheckpointPayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedDurableJobSchema = z
  .object({
    payload: DurableJobPayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();
const SignedPortfolioBaselineSchema = z
  .object({
    payload: PortfolioBaselinePayloadSchema,
    signature: AttestationSignatureSchema,
  })
  .strict();

export type SignedRepositoryObservation = z.infer<
  typeof SignedRepositoryObservationSchema
>;
export type SignedWorktreeBinding = z.infer<typeof SignedWorktreeBindingSchema>;
export type SignedDeviceHeartbeat = z.infer<typeof SignedDeviceHeartbeatSchema>;
export type SignedDeviceEnrolment = z.infer<typeof SignedDeviceEnrolmentSchema>;
export type SignedExecutionLease = z.infer<typeof SignedExecutionLeaseSchema>;
export type SignedDeviceCheckpoint = z.infer<
  typeof SignedDeviceCheckpointSchema
>;
export type SignedDurableJob = z.infer<typeof SignedDurableJobSchema>;
export type SignedPortfolioBaseline = z.infer<
  typeof SignedPortfolioBaselineSchema
>;

export const PortfolioDriftManifestSchema = z
  .object({
    schema: z.literal(PORTFOLIO_MANIFEST_SCHEMA),
    registryVersion: Id,
    generatedAt: Timestamp,
    repositoryObservations: z.array(SignedRepositoryObservationSchema),
    worktreeBindings: z.array(SignedWorktreeBindingSchema),
    deviceEnrolments: z.array(SignedDeviceEnrolmentSchema),
    deviceHeartbeats: z.array(SignedDeviceHeartbeatSchema),
    leases: z.array(SignedExecutionLeaseSchema),
    checkpoints: z.array(SignedDeviceCheckpointSchema),
    jobs: z.array(SignedDurableJobSchema),
    baselines: z.array(SignedPortfolioBaselineSchema),
    manifestHash: Sha256,
  })
  .strict();

export type PortfolioDriftManifest = z.infer<
  typeof PortfolioDriftManifestSchema
>;
export type AttestationKeyResolver = (
  signerId: string,
  keyRef: string,
) => string | null;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export function canonicalHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

function sortedRecordHashes(
  records: Array<{ signature: { recordHash: string } }>,
): string[] {
  return [...new Set(records.map((record) => canonicalHash(record)))].sort();
}

function baselineEvidenceFromManifest(
  evidence: Pick<
    PortfolioDriftManifest,
    | "repositoryObservations"
    | "worktreeBindings"
    | "deviceEnrolments"
    | "deviceHeartbeats"
    | "leases"
    | "checkpoints"
    | "jobs"
  >,
): BaselineEvidence {
  return {
    repositoryObservationHashes: sortedRecordHashes(
      evidence.repositoryObservations,
    ),
    worktreeBindingHashes: sortedRecordHashes(evidence.worktreeBindings),
    deviceEnrolmentHashes: sortedRecordHashes(evidence.deviceEnrolments),
    deviceHeartbeatHashes: sortedRecordHashes(evidence.deviceHeartbeats),
    leaseHashes: sortedRecordHashes(evidence.leases),
    checkpointHashes: sortedRecordHashes(evidence.checkpoints),
    jobHashes: sortedRecordHashes(evidence.jobs),
  };
}

export function buildPortfolioBaselinePayload(input: {
  baselineId: string;
  registryVersion: string;
  recordedAt: string;
  evidence: Pick<
    PortfolioDriftManifest,
    | "repositoryObservations"
    | "worktreeBindings"
    | "deviceEnrolments"
    | "deviceHeartbeats"
    | "leases"
    | "checkpoints"
    | "jobs"
  >;
}): PortfolioBaselinePayload {
  const evidence = baselineEvidenceFromManifest(input.evidence);
  return PortfolioBaselinePayloadSchema.parse({
    schema: PORTFOLIO_BASELINE_SCHEMA,
    baselineId: input.baselineId,
    registryVersion: input.registryVersion,
    state: "in_progress",
    recordedAt: input.recordedAt,
    evidence,
    evidenceSnapshotHash: canonicalHash(evidence),
  });
}

function recordSignature(
  schema: string,
  recordHash: string,
  key: string,
): string {
  return createHmac("sha256", key)
    .update(`nexus:portfolio-control-plane:v1:${schema}:${recordHash}`)
    .digest("hex");
}

export function signControlPlaneRecord<T extends { schema: string }>(
  payload: T,
  signerId: string,
  key: string,
): SignedEnvelope<T> {
  const recordHash = canonicalHash(payload);
  return {
    payload,
    signature: {
      algorithm: "hmac-sha256",
      signerId,
      recordHash,
      value: recordSignature(payload.schema, recordHash, key),
    },
  };
}

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyEnvelope<T extends { schema: string }>(
  envelope: SignedEnvelope<T>,
  expectedSigner: string,
  key: string,
): boolean {
  const recordHash = canonicalHash(envelope.payload);
  const expected = recordSignature(envelope.payload.schema, recordHash, key);
  return (
    envelope.signature.signerId === expectedSigner &&
    envelope.signature.recordHash === recordHash &&
    secureEqual(envelope.signature.value, expected)
  );
}

export function repositoryContentManifestHash(
  payload: Omit<RepositoryObservationPayload, "contentManifestHash">,
): string {
  return canonicalHash({
    repositoryId: payload.repositoryId,
    observedRevision: payload.observedRevision,
    worktree: payload.worktree,
    workingTree: payload.workingTree,
    generatedResidue: payload.generatedResidue,
  });
}

export function buildPortfolioDriftManifest(
  input: Omit<PortfolioDriftManifest, "schema" | "manifestHash">,
): PortfolioDriftManifest {
  const material = { schema: PORTFOLIO_MANIFEST_SCHEMA, ...input };
  return { ...material, manifestHash: canonicalHash(material) };
}

export function parsePortfolioControlPlaneRegistry(
  value: unknown,
): PortfolioControlPlaneRegistry {
  return PortfolioControlPlaneRegistrySchema.parse(value);
}

export type ControlPlaneState =
  "observed" | "stale" | "offline" | "quarantined" | "unproven";

export interface RepositoryDriftProjection {
  projectId: string;
  repositoryId: string;
  state: ControlPlaneState;
  revision: string | null;
  branch: string | null;
  worktreeRole: string | null;
  drift: string;
  evidenceAt: string | null;
  evidenceFreshness: "fresh" | "stale" | "unproven";
  blocker: string | null;
  nextSafeAction: string;
  provenance: string;
}

export interface DeviceControlProjection {
  deviceId: string;
  label: string;
  state: ControlPlaneState;
  heartbeatAt: string | null;
  operatingStatus:
    | "baseline_in_progress"
    | "enrolled"
    | "active"
    | "stale"
    | "offline"
    | "unknown";
  enrolmentState: "enrolled" | "missing" | "expired" | "rejected";
  newExecutionEligible: boolean;
  worker: DeviceHeartbeatPayload["worker"] | null;
  leaseState: "current" | "expired" | "rejected" | "none";
  durableJob: {
    jobId: string;
    objective: string;
    state: DurableJobPayload["state"];
    checkpoint: {
      stage: string;
      currentWork: string;
      evidenceRefs: string[];
    } | null;
    blocker: string | null;
    nextAction: string;
  } | null;
  reason: string;
}

export interface PortfolioControlPlaneProjection {
  schema: typeof PORTFOLIO_PROJECTION_SCHEMA;
  generatedAt: string;
  mode: "read_only_local_candidate";
  remoteDispatchEnabled: false;
  repositoryReconciliationEnabled: false;
  externalMutationEnabled: false;
  registry: {
    state: "observed" | "quarantined";
    version: string | null;
    authority: string | null;
    reason: string;
  };
  baseline: {
    state: "baseline_in_progress" | "not_started" | "quarantined";
    baselineId: string | null;
    recordedAt: string | null;
    evidenceSnapshotHash: string | null;
    reason: string;
  };
  summary: Record<ControlPlaneState, number>;
  repositories: RepositoryDriftProjection[];
  devices: DeviceControlProjection[];
  unknownWork: Array<{
    recordHash: string;
    state: "unknown";
    reason: string;
  }>;
  nextSafeAction: string;
}

function keyForDevice(
  registry: PortfolioControlPlaneRegistry,
  deviceId: string,
  resolver: AttestationKeyResolver,
): string | null {
  const device = registry.devices.find((item) => item.deviceId === deviceId);
  return device ? resolver(device.deviceId, device.attestationKeyRef) : null;
}

function keyForControlPlane(
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
): string | null {
  return resolver("mission-control", registry.controlPlaneAttestationKeyRef);
}

function parseTime(value: string): number | null {
  if (!EXPLICIT_TIMESTAMP.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyRepository(
  repository: RegisteredRepository,
  raw: unknown,
  worktreeBindings: unknown[],
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
  nowMs: number,
): RepositoryDriftProjection {
  const base = {
    projectId: repository.projectId,
    repositoryId: repository.repositoryId,
    revision: null,
    branch: null,
    worktreeRole: null,
    evidenceAt: null,
  };
  if (!raw)
    return {
      ...base,
      state: "unproven",
      drift: "unknown",
      evidenceFreshness: "unproven",
      blocker: "No signed repository observation is available.",
      nextSafeAction:
        "Run the read-only preflight from a registered device against an explicitly bound worktree.",
      provenance: "registry_only",
    };
  const parsed = SignedRepositoryObservationSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ...base,
      state: "quarantined",
      drift: "malformed_observation",
      evidenceFreshness: "unproven",
      blocker:
        "Repository observation is malformed or contains unrecognised claims.",
      nextSafeAction:
        "Regenerate the observation with the current collector and registry version.",
      provenance: "rejected_schema",
    };
  const envelope = parsed.data;
  const payload = envelope.payload;
  const projected = {
    ...base,
    revision: payload.observedRevision,
    branch: payload.worktree.branch,
    worktreeRole: payload.worktree.role,
    evidenceAt: payload.observedAt,
  };
  const deviceKey = keyForDevice(registry, payload.deviceId, resolver);
  if (!deviceKey)
    return {
      ...projected,
      state: "unproven",
      drift: "attestation_key_unavailable",
      evidenceFreshness: "unproven",
      blocker: "The registered device attestation binding is unavailable.",
      nextSafeAction:
        "Provision or restore the approved non-secret device key binding; do not copy credential values between runtimes.",
      provenance: "signature_not_checked",
    };
  if (!verifyEnvelope(envelope, payload.deviceId, deviceKey))
    return {
      ...projected,
      state: "quarantined",
      drift: "forged_or_changed_observation",
      evidenceFreshness: "unproven",
      blocker: "Observation signature or content hash does not verify.",
      nextSafeAction:
        "Quarantine this observation and regenerate it on the registered device.",
      provenance: "signature_rejected",
    };
  const material = { ...payload } as RepositoryObservationPayload;
  const claimedHash = material.contentManifestHash;
  delete (material as Partial<RepositoryObservationPayload>)
    .contentManifestHash;
  const actualHash = repositoryContentManifestHash(
    material as Omit<RepositoryObservationPayload, "contentManifestHash">,
  );
  const identityMismatch =
    payload.registryVersion !== registry.registryVersion ||
    payload.projectId !== repository.projectId ||
    payload.repositoryId.toLowerCase() !==
      repository.repositoryId.toLowerCase() ||
    !repository.allowedWorktreeRoles.includes(payload.worktree.role) ||
    !repository.allowedEvidenceSources.includes(payload.collector.source);
  if (identityMismatch || claimedHash !== actualHash)
    return {
      ...projected,
      state: "quarantined",
      drift: "identity_or_manifest_mismatch",
      evidenceFreshness: "unproven",
      blocker:
        "Repository, worktree, registry, evidence source or content manifest binding conflicts.",
      nextSafeAction:
        "Preserve the checkout and rerun preflight against the canonical registry binding.",
      provenance: "identity_rejected",
    };
  const currentIdentityBindings = worktreeBindings
    .map((candidate) => SignedWorktreeBindingSchema.safeParse(candidate))
    .filter((candidate) => candidate.success)
    .map((candidate) => candidate.data)
    .filter((candidate) => {
      const binding = candidate.payload;
      const issuedAt = parseTime(binding.issuedAt);
      const expiresAt = parseTime(binding.expiresAt);
      return (
        verifyControlPlaneEnvelope(candidate, registry, resolver).valid &&
        binding.registryVersion === registry.registryVersion &&
        binding.projectId === payload.projectId &&
        binding.repositoryId.toLowerCase() ===
          payload.repositoryId.toLowerCase() &&
        binding.deviceId === payload.deviceId &&
        binding.worktreeId === payload.worktree.worktreeId &&
        binding.pathHash === payload.worktree.pathHash &&
        binding.role === payload.worktree.role &&
        issuedAt !== null &&
        expiresAt !== null &&
        issuedAt <= nowMs &&
        expiresAt > nowMs
      );
    });
  if (currentIdentityBindings.length > 1)
    return {
      ...projected,
      state: "quarantined",
      drift: "worktree_binding_conflict",
      evidenceFreshness: "unproven",
      blocker:
        "Multiple current Mission Control bindings claim the same worktree identity.",
      nextSafeAction:
        "Quarantine every competing owner binding and reconcile ownership without editing the checkout.",
      provenance: "binding_conflict",
    };
  const bindingMatches = worktreeBindings.filter((candidate) => {
    const parsedBinding = SignedWorktreeBindingSchema.safeParse(candidate);
    return (
      parsedBinding.success &&
      parsedBinding.data.payload.bindingId === payload.declaredOwner.bindingId
    );
  });
  if (!payload.declaredOwner.bindingId || bindingMatches.length === 0)
    return {
      ...projected,
      state: "unproven",
      drift: "worktree_binding_missing",
      evidenceFreshness: "unproven",
      blocker: "No Mission Control-signed worktree ownership binding exists.",
      nextSafeAction:
        "Register this exact worktree, device and owner in Mission Control before relying on its observation.",
      provenance: "device_observation_without_control_binding",
    };
  if (bindingMatches.length !== 1)
    return {
      ...projected,
      state: "quarantined",
      drift: "worktree_binding_conflict",
      evidenceFreshness: "unproven",
      blocker: "Multiple worktree ownership bindings claim the same identity.",
      nextSafeAction:
        "Quarantine the bindings and resolve ownership without editing the checkout.",
      provenance: "binding_conflict",
    };
  const bindingEnvelope = SignedWorktreeBindingSchema.parse(bindingMatches[0]);
  const verifiedBinding = verifyControlPlaneEnvelope(
    bindingEnvelope,
    registry,
    resolver,
  );
  if (!verifiedBinding.available)
    return {
      ...projected,
      state: "unproven",
      drift: "control_plane_key_unavailable",
      evidenceFreshness: "unproven",
      blocker: "The Mission Control attestation binding is unavailable.",
      nextSafeAction:
        "Restore the approved control-plane key binding; do not accept the device declaration alone.",
      provenance: "binding_signature_not_checked",
    };
  const binding = bindingEnvelope.payload;
  const issuedAt = parseTime(binding.issuedAt);
  const expiresAt = parseTime(binding.expiresAt);
  const bindingMismatch =
    !verifiedBinding.valid ||
    binding.registryVersion !== registry.registryVersion ||
    binding.projectId !== payload.projectId ||
    binding.repositoryId.toLowerCase() !== payload.repositoryId.toLowerCase() ||
    binding.deviceId !== payload.deviceId ||
    binding.worktreeId !== payload.worktree.worktreeId ||
    binding.pathHash !== payload.worktree.pathHash ||
    binding.role !== payload.worktree.role ||
    binding.ownerId !== payload.declaredOwner.ownerId ||
    issuedAt === null ||
    expiresAt === null ||
    issuedAt > nowMs ||
    expiresAt <= issuedAt;
  if (bindingMismatch)
    return {
      ...projected,
      state: "quarantined",
      drift: "worktree_binding_rejected",
      evidenceFreshness: "unproven",
      blocker:
        "Worktree, owner, device, repository or control-plane signature binding was rejected.",
      nextSafeAction:
        "Preserve the checkout and issue a new exact Mission Control worktree binding after ownership review.",
      provenance: "binding_rejected",
    };
  if (expiresAt < nowMs)
    return {
      ...projected,
      state: "stale",
      drift: "worktree_binding_expired",
      evidenceFreshness: "stale",
      blocker: "The worktree ownership binding expired.",
      nextSafeAction:
        "Confirm ownership and issue a new binding before collecting fresh evidence.",
      provenance: "expired_control_binding",
    };
  const observedMs = parseTime(payload.observedAt);
  if (observedMs === null || observedMs > nowMs)
    return {
      ...projected,
      state: "quarantined",
      drift: "invalid_evidence_time",
      evidenceFreshness: "unproven",
      blocker: "Observation time is invalid or in the future.",
      nextSafeAction:
        "Correct device time and regenerate the signed observation.",
      provenance: "time_rejected",
    };
  if (nowMs - observedMs > registry.freshness.evidenceFreshForMs)
    return {
      ...projected,
      state: "stale",
      drift: "observation_stale",
      evidenceFreshness: "stale",
      blocker: "Repository evidence exceeded its freshness window.",
      nextSafeAction:
        "Rerun the read-only preflight; do not infer current state from the last observation.",
      provenance: "signed_device_attestation",
    };
  const dirty = payload.workingTree.classification !== "clean";
  const residue = payload.generatedResidue.classification !== "none";
  const upstreamIncomplete =
    payload.upstream.freshness !== "fresh" ||
    payload.upstream.ahead === null ||
    payload.upstream.behind === null ||
    !payload.upstream.ref ||
    !payload.upstream.revision;
  const drifted =
    (payload.upstream.ahead ?? 0) > 0 ||
    (payload.upstream.behind ?? 0) > 0 ||
    payload.worktree.detached;
  if (dirty || residue || upstreamIncomplete || drifted) {
    const causes = [
      dirty && payload.workingTree.classification,
      residue && payload.generatedResidue.classification,
      upstreamIncomplete && `upstream_${payload.upstream.freshness}`,
      drifted && "revision_drift",
    ]
      .filter(Boolean)
      .join(", ");
    return {
      ...projected,
      state: "quarantined",
      drift: causes,
      evidenceFreshness: "fresh",
      blocker:
        "Fresh evidence shows a checkout that is not eligible for automatic reconciliation.",
      nextSafeAction:
        dirty || residue
          ? "Preserve the checkout and inventory local work and generated residue before any reconciliation."
          : "Create a fresh isolated worktree from a separately refreshed base; do not pull, reset or rebase this checkout.",
      provenance: "signed_device_attestation",
    };
  }
  if (
    payload.baseRevision !== payload.observedRevision ||
    payload.upstream.revision !== payload.observedRevision
  )
    return {
      ...projected,
      state: "quarantined",
      drift: "revision_binding_conflict",
      evidenceFreshness: "fresh",
      blocker:
        "Clean counters conflict with the observed, base or upstream revision.",
      nextSafeAction:
        "Regenerate the Git read-back; do not accept the claimed clean state.",
      provenance: "signed_device_attestation",
    };
  return {
    ...projected,
    state: "observed",
    drift: "clean_at_observed_revision",
    evidenceFreshness: "fresh",
    blocker: null,
    nextSafeAction:
      "Eligible for independent exact-revision review only; release and reconciliation remain separately governed.",
    provenance: "signed_device_attestation",
  };
}

interface VerifiedRecord<T> {
  payload: T;
  valid: boolean;
  available: boolean;
}

function verifyControlPlaneEnvelope<T extends { schema: string }>(
  envelope: SignedEnvelope<T>,
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
): VerifiedRecord<T> {
  const key = keyForControlPlane(registry, resolver);
  return {
    payload: envelope.payload,
    valid: !!key && verifyEnvelope(envelope, "mission-control", key),
    available: !!key,
  };
}

function verifiedDeviceEnvelope<T extends { schema: string; deviceId: string }>(
  envelope: SignedEnvelope<T>,
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
): VerifiedRecord<T> {
  const key = keyForDevice(registry, envelope.payload.deviceId, resolver);
  return {
    payload: envelope.payload,
    valid: !!key && verifyEnvelope(envelope, envelope.payload.deviceId, key),
    available: !!key,
  };
}

function enrolmentForWorker(
  device: RegisteredDevice,
  worker: DeviceHeartbeatPayload["worker"],
  manifest: PortfolioDriftManifest | null,
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
  nowMs: number,
): {
  state: DeviceControlProjection["enrolmentState"];
  reason: string;
} {
  const candidates = (manifest?.deviceEnrolments ?? []).filter(
    (item) =>
      item.payload.deviceId === device.deviceId &&
      item.payload.workerId === worker.workerId,
  );
  if (candidates.length === 0)
    return {
      state: "missing",
      reason: "No Mission Control-signed device enrolment receipt exists.",
    };
  const ids = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const hashes = ids.get(candidate.payload.enrolmentId) ?? new Set<string>();
    hashes.add(canonicalHash(candidate));
    ids.set(candidate.payload.enrolmentId, hashes);
  }
  if ([...ids.values()].some((hashes) => hashes.size > 1))
    return {
      state: "rejected",
      reason: "Conflicting enrolment receipts reuse the same identity.",
    };
  const envelope = [...candidates].sort(
    (a, b) => Date.parse(b.payload.issuedAt) - Date.parse(a.payload.issuedAt),
  )[0];
  const verified = verifyControlPlaneEnvelope(envelope, registry, resolver);
  const issuedAt = parseTime(envelope.payload.issuedAt);
  const expiresAt = parseTime(envelope.payload.expiresAt);
  if (!verified.available)
    return {
      state: "missing",
      reason:
        "The approved Mission Control attestation binding is unavailable.",
    };
  if (
    !verified.valid ||
    envelope.payload.registryVersion !== registry.registryVersion ||
    envelope.payload.deviceId !== device.deviceId ||
    envelope.payload.workerId !== worker.workerId ||
    envelope.payload.harness !== worker.harness ||
    envelope.payload.harnessVersion !== worker.harnessVersion ||
    !device.allowedHarnesses.includes(envelope.payload.harness) ||
    issuedAt === null ||
    expiresAt === null ||
    issuedAt > nowMs ||
    expiresAt <= issuedAt
  )
    return {
      state: "rejected",
      reason:
        "Device enrolment signature, identity, harness or time binding was rejected.",
    };
  if (expiresAt < nowMs)
    return {
      state: "expired",
      reason: "The device enrolment receipt has expired.",
    };
  return {
    state: "enrolled",
    reason: "Mission Control-signed device enrolment is current.",
  };
}

function classifyBaseline(
  manifest: PortfolioDriftManifest | null,
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
  nowMs: number,
): PortfolioControlPlaneProjection["baseline"] {
  const candidates = manifest?.baselines ?? [];
  if (candidates.length === 0)
    return {
      state: "not_started",
      baselineId: null,
      recordedAt: null,
      evidenceSnapshotHash: null,
      reason: "No signed FREEZE/BASELINE receipt is available.",
    };
  const ids = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const hashes = ids.get(candidate.payload.baselineId) ?? new Set<string>();
    hashes.add(canonicalHash(candidate));
    ids.set(candidate.payload.baselineId, hashes);
  }
  if ([...ids.values()].some((hashes) => hashes.size > 1))
    return {
      state: "quarantined",
      baselineId: null,
      recordedAt: null,
      evidenceSnapshotHash: null,
      reason: "Conflicting baseline records reuse the same identity.",
    };
  const envelope = [...candidates].sort(
    (a, b) =>
      Date.parse(b.payload.recordedAt) - Date.parse(a.payload.recordedAt),
  )[0];
  const verification = verifyPortfolioBaselineEnvelope({
    envelope,
    registry,
    keyResolver: resolver,
    nowMs,
  });
  const payload = envelope.payload;
  const currentEvidence = baselineEvidenceFromManifest(manifest!);
  if (
    !verification.valid ||
    canonicalHash(currentEvidence) !== canonicalHash(payload.evidence)
  )
    return {
      state: "quarantined",
      baselineId: payload.baselineId,
      recordedAt: payload.recordedAt,
      evidenceSnapshotHash: null,
      reason:
        "Baseline signature, registry, timestamp or exact current evidence snapshot was rejected.",
    };
  return {
    state: "baseline_in_progress",
    baselineId: payload.baselineId,
    recordedAt: payload.recordedAt,
    evidenceSnapshotHash: payload.evidenceSnapshotHash,
    reason:
      "Signed baseline preserves the observed evidence set; unchecked remote machines remain unverified.",
  };
}

export function verifyPortfolioBaselineEnvelope(input: {
  envelope: unknown;
  registry: PortfolioControlPlaneRegistry;
  keyResolver: AttestationKeyResolver;
  nowMs?: number;
}): { valid: boolean; reason: string } {
  const parsed = SignedPortfolioBaselineSchema.safeParse(input.envelope);
  if (!parsed.success)
    return { valid: false, reason: "Baseline envelope is malformed." };
  const verified = verifyControlPlaneEnvelope(
    parsed.data,
    input.registry,
    input.keyResolver,
  );
  const payload = parsed.data.payload;
  const recordedAt = parseTime(payload.recordedAt);
  if (
    !verified.available ||
    !verified.valid ||
    payload.registryVersion !== input.registry.registryVersion ||
    payload.evidenceSnapshotHash !== canonicalHash(payload.evidence) ||
    recordedAt === null ||
    recordedAt > (input.nowMs ?? Date.now())
  )
    return {
      valid: false,
      reason:
        "Baseline signature, registry, timestamp or evidence snapshot is invalid.",
    };
  return {
    valid: true,
    reason: "Baseline evidence is immutable and verified.",
  };
}

function classifyDevice(
  device: RegisteredDevice,
  manifest: PortfolioDriftManifest | null,
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
  nowMs: number,
): DeviceControlProjection {
  const heartbeats = (manifest?.deviceHeartbeats ?? []).filter(
    (item) => item.payload.deviceId === device.deviceId,
  );
  const bySequence = new Map<number, SignedDeviceHeartbeat[]>();
  for (const heartbeat of heartbeats)
    bySequence.set(heartbeat.payload.sequence, [
      ...(bySequence.get(heartbeat.payload.sequence) ?? []),
      heartbeat,
    ]);
  const conflictingReplay = [...bySequence.values()].some(
    (items) => new Set(items.map((item) => canonicalHash(item))).size > 1,
  );
  if (conflictingReplay)
    return {
      deviceId: device.deviceId,
      label: device.label,
      state: "quarantined",
      heartbeatAt: null,
      operatingStatus: "unknown",
      enrolmentState: "rejected",
      newExecutionEligible: false,
      worker: null,
      leaseState: "rejected",
      durableJob: null,
      reason: "Conflicting heartbeats reuse the same device sequence.",
    };
  const heartbeat = heartbeats.sort(
    (a, b) => b.payload.sequence - a.payload.sequence,
  )[0];
  if (!heartbeat)
    return {
      deviceId: device.deviceId,
      label: device.label,
      state: "unproven",
      heartbeatAt: null,
      operatingStatus: "unknown",
      enrolmentState: "missing",
      newExecutionEligible: false,
      worker: null,
      leaseState: "none",
      durableJob: null,
      reason: "Registered device has never supplied a signed heartbeat.",
    };
  const verifiedHeartbeat = verifiedDeviceEnvelope(
    heartbeat,
    registry,
    resolver,
  );
  if (!verifiedHeartbeat.available)
    return {
      deviceId: device.deviceId,
      label: device.label,
      state: "unproven",
      heartbeatAt: heartbeat.payload.observedAt,
      operatingStatus: "unknown",
      enrolmentState: "missing",
      newExecutionEligible: false,
      worker: null,
      leaseState: "none",
      durableJob: durableJobForDevice(
        device,
        manifest,
        registry,
        resolver,
        nowMs,
      ).job,
      reason: "Device attestation key binding is unavailable.",
    };
  const diagnosticAdapter = device.heartbeatAdapters.find(
    (adapter) => adapter.adapterId === heartbeat.payload.source.adapterId,
  );
  const adapterRegistered =
    heartbeat.payload.source.kind === "device_runtime" ||
    diagnosticAdapter !== undefined;
  if (
    verifiedHeartbeat.valid &&
    adapterRegistered &&
    (diagnosticAdapter?.evidenceScope === "diagnostic_only" ||
      heartbeat.payload.source.identityBinding === "unverified_transport")
  )
    return {
      deviceId: device.deviceId,
      label: device.label,
      state: "unproven",
      heartbeatAt: heartbeat.payload.observedAt,
      operatingStatus: "unknown",
      enrolmentState: "missing",
      newExecutionEligible: false,
      worker: null,
      leaseState: "none",
      durableJob: durableJobForDevice(
        device,
        manifest,
        registry,
        resolver,
        nowMs,
      ).job,
      reason:
        "Heartbeat adapter is registry-limited to diagnostic evidence without authenticated device identity.",
    };
  if (
    !verifiedHeartbeat.valid ||
    !adapterRegistered ||
    heartbeat.payload.registryVersion !== registry.registryVersion ||
    !device.allowedHarnesses.includes(heartbeat.payload.worker.harness)
  ) {
    return {
      deviceId: device.deviceId,
      label: device.label,
      state: "quarantined",
      heartbeatAt: heartbeat.payload.observedAt,
      operatingStatus: "unknown",
      enrolmentState: "rejected",
      newExecutionEligible: false,
      worker: null,
      leaseState: "rejected",
      durableJob: durableJobForDevice(
        device,
        manifest,
        registry,
        resolver,
        nowMs,
      ).job,
      reason:
        "Heartbeat signature, registry version, device identity or harness binding was rejected.",
    };
  }
  const observedMs = parseTime(heartbeat.payload.observedAt);
  const expiresMs = parseTime(heartbeat.payload.expiresAt);
  if (
    observedMs === null ||
    expiresMs === null ||
    observedMs > nowMs ||
    expiresMs <= observedMs
  ) {
    return {
      deviceId: device.deviceId,
      label: device.label,
      state: "quarantined",
      heartbeatAt: heartbeat.payload.observedAt,
      operatingStatus: "unknown",
      enrolmentState: "rejected",
      newExecutionEligible: false,
      worker: null,
      leaseState: "rejected",
      durableJob: durableJobForDevice(
        device,
        manifest,
        registry,
        resolver,
        nowMs,
      ).job,
      reason: "Heartbeat time window is invalid.",
    };
  }
  const age = nowMs - observedMs;
  const state: ControlPlaneState =
    age <= registry.freshness.heartbeatFreshForMs && expiresMs >= nowMs
      ? "observed"
      : age <= registry.freshness.heartbeatStaleAfterMs
        ? "stale"
        : "offline";
  const durable = durableJobForDevice(
    device,
    manifest,
    registry,
    resolver,
    nowMs,
  );
  const enrolment = enrolmentForWorker(
    device,
    heartbeat.payload.worker,
    manifest,
    registry,
    resolver,
    nowMs,
  );
  const heartbeatLinksMatch =
    durable.job === null
      ? heartbeat.payload.activeJobId === null &&
        heartbeat.payload.lastCheckpointId === null
      : heartbeat.payload.activeJobId === durable.job.jobId &&
        heartbeat.payload.lastCheckpointId ===
          (durable.job.checkpoint
            ? jobCheckpointId(manifest, durable.job.jobId)
            : null) &&
        durable.leaseState !== "rejected";
  const newExecutionEligible =
    state === "observed" &&
    enrolment.state === "enrolled" &&
    heartbeatLinksMatch;
  const projectedState: ControlPlaneState =
    enrolment.state === "rejected"
      ? "quarantined"
      : enrolment.state === "missing"
        ? "unproven"
        : enrolment.state === "expired" && state === "observed"
          ? "stale"
          : state;
  const operatingStatus: DeviceControlProjection["operatingStatus"] =
    projectedState === "offline"
      ? "offline"
      : projectedState === "stale"
        ? "stale"
        : projectedState === "observed" &&
            newExecutionEligible &&
            durable.job &&
            durable.leaseState === "current"
          ? "active"
          : projectedState === "observed" && enrolment.state === "enrolled"
            ? "enrolled"
            : "unknown";
  return {
    deviceId: device.deviceId,
    label: device.label,
    state: projectedState,
    heartbeatAt: heartbeat.payload.observedAt,
    operatingStatus,
    enrolmentState: enrolment.state,
    newExecutionEligible,
    worker: projectedState === "observed" ? heartbeat.payload.worker : null,
    leaseState: durable.leaseState,
    durableJob: durable.job,
    reason: !heartbeatLinksMatch
      ? "Heartbeat, durable job or checkpoint identity does not reconcile; new execution is denied."
      : enrolment.state !== "enrolled"
        ? `${enrolment.reason} New execution is denied.`
        : state === "observed"
          ? "Signed device heartbeat and enrolment are current."
          : state === "stale"
            ? "Heartbeat is stale; durable state remains visible but work is not current."
            : "Heartbeat expired; durable state remains visible and execution is not current.",
  };
}

function jobCheckpointId(
  manifest: PortfolioDriftManifest | null,
  jobId: string,
): string | null {
  const job = (manifest?.jobs ?? []).find(
    (item) => item.payload.jobId === jobId,
  );
  return job?.payload.checkpointId ?? null;
}

function durableJobForDevice(
  device: RegisteredDevice,
  manifest: PortfolioDriftManifest | null,
  registry: PortfolioControlPlaneRegistry,
  resolver: AttestationKeyResolver,
  nowMs: number,
): {
  job: DeviceControlProjection["durableJob"];
  leaseState: DeviceControlProjection["leaseState"];
} {
  const jobs = (manifest?.jobs ?? [])
    .filter((item) => item.payload.assignedDeviceId === device.deviceId)
    .sort(
      (a, b) =>
        Date.parse(b.payload.updatedAt) - Date.parse(a.payload.updatedAt),
    );
  const envelope = jobs[0];
  if (!envelope) return { job: null, leaseState: "none" };
  const verifiedJob = verifyControlPlaneEnvelope(envelope, registry, resolver);
  if (
    !verifiedJob.available ||
    !verifiedJob.valid ||
    envelope.payload.registryVersion !== registry.registryVersion
  )
    return { job: null, leaseState: "rejected" };
  const job = envelope.payload;
  const leaseEnvelope = (manifest?.leases ?? []).find(
    (item) =>
      item.payload.leaseId === job.leaseId && item.payload.jobId === job.jobId,
  );
  const checkpointEnvelope = (manifest?.checkpoints ?? []).find(
    (item) =>
      item.payload.checkpointId === job.checkpointId &&
      item.payload.jobId === job.jobId,
  );
  let leaseState: DeviceControlProjection["leaseState"] = "none";
  let validLease: ExecutionLeasePayload | null = null;
  if (leaseEnvelope) {
    const verifiedLease = verifyControlPlaneEnvelope(
      leaseEnvelope,
      registry,
      resolver,
    );
    const acquired = parseTime(leaseEnvelope.payload.acquiredAt);
    const expires = parseTime(leaseEnvelope.payload.expiresAt);
    const duration =
      acquired === null || expires === null
        ? Number.POSITIVE_INFINITY
        : expires - acquired;
    const bindingValid =
      verifiedLease.valid &&
      leaseEnvelope.payload.registryVersion === registry.registryVersion &&
      leaseEnvelope.payload.deviceId === device.deviceId &&
      leaseEnvelope.payload.workerId === job.assignedWorkerId &&
      acquired !== null &&
      acquired <= nowMs &&
      expires !== null &&
      duration > 0 &&
      duration <= registry.freshness.leaseMaximumMs;
    if (!verifiedLease.available || !bindingValid) leaseState = "rejected";
    else {
      validLease = leaseEnvelope.payload;
      leaseState = expires! <= nowMs ? "expired" : "current";
    }
  }
  let checkpoint: NonNullable<
    DeviceControlProjection["durableJob"]
  >["checkpoint"] = null;
  if (checkpointEnvelope && validLease) {
    const verifiedCheckpoint = verifiedDeviceEnvelope(
      checkpointEnvelope,
      registry,
      resolver,
    );
    const payload = checkpointEnvelope.payload;
    if (
      verifiedCheckpoint.valid &&
      payload.registryVersion === registry.registryVersion &&
      payload.deviceId === device.deviceId &&
      payload.workerId === validLease.workerId &&
      payload.leaseId === validLease.leaseId &&
      payload.fencingToken === validLease.fencingToken
    ) {
      checkpoint = {
        stage: payload.stage,
        currentWork: payload.currentWork,
        evidenceRefs: [...payload.evidenceRefs],
      };
    } else {
      leaseState = "rejected";
    }
  }
  return {
    leaseState,
    job: {
      jobId: job.jobId,
      objective: job.objective,
      state: leaseState === "expired" ? "paused_offline" : job.state,
      checkpoint,
      blocker:
        leaseState === "rejected"
          ? "Lease or checkpoint provenance was rejected."
          : job.blocker,
      nextAction:
        leaseState === "current"
          ? job.nextAction
          : "Retain the durable checkpoint and obtain a new fenced lease before resuming.",
    },
  };
}

function emptyProjection(
  nowMs: number,
  reason: string,
): PortfolioControlPlaneProjection {
  return {
    schema: PORTFOLIO_PROJECTION_SCHEMA,
    generatedAt: new Date(nowMs).toISOString(),
    mode: "read_only_local_candidate",
    remoteDispatchEnabled: false,
    repositoryReconciliationEnabled: false,
    externalMutationEnabled: false,
    registry: { state: "quarantined", version: null, authority: null, reason },
    baseline: {
      state: "quarantined",
      baselineId: null,
      recordedAt: null,
      evidenceSnapshotHash: null,
      reason: "Baseline cannot be verified without a valid canonical registry.",
    },
    summary: { observed: 0, stale: 0, offline: 0, quarantined: 0, unproven: 0 },
    repositories: [],
    devices: [],
    unknownWork: [],
    nextSafeAction:
      "Repair and independently review the canonical registry before collecting or presenting portfolio state.",
  };
}

export function buildPortfolioControlPlaneProjection(input: {
  registry: unknown;
  manifest: unknown;
  keyResolver: AttestationKeyResolver;
  nowMs?: number;
}): PortfolioControlPlaneProjection {
  const nowMs = input.nowMs ?? Date.now();
  const parsedRegistry = PortfolioControlPlaneRegistrySchema.safeParse(
    input.registry,
  );
  if (!parsedRegistry.success)
    return emptyProjection(
      nowMs,
      "Canonical control-plane registry is missing or malformed.",
    );
  const registry = parsedRegistry.data;
  const parsedManifest =
    input.manifest === null || input.manifest === undefined
      ? null
      : PortfolioDriftManifestSchema.safeParse(input.manifest);
  let manifest: PortfolioDriftManifest | null = null;
  let manifestRejected = false;
  if (parsedManifest && parsedManifest.success) {
    const { manifestHash, ...material } = parsedManifest.data;
    if (
      manifestHash === canonicalHash(material) &&
      parsedManifest.data.registryVersion === registry.registryVersion
    )
      manifest = parsedManifest.data;
    else manifestRejected = true;
  } else if (parsedManifest && !parsedManifest.success) manifestRejected = true;

  const repositories = registry.repositories.map((repository) => {
    if (manifestRejected)
      return classifyRepository(
        repository,
        { status: "green" },
        [],
        registry,
        input.keyResolver,
        nowMs,
      );
    const matches =
      manifest?.repositoryObservations.filter(
        (item) => item.payload.projectId === repository.projectId,
      ) ?? [];
    if (matches.length > 1)
      return classifyRepository(
        repository,
        { duplicate: matches },
        manifest?.worktreeBindings ?? [],
        registry,
        input.keyResolver,
        nowMs,
      );
    return classifyRepository(
      repository,
      matches[0] ?? null,
      manifest?.worktreeBindings ?? [],
      registry,
      input.keyResolver,
      nowMs,
    );
  });
  const devices = registry.devices.map((device) =>
    manifestRejected
      ? {
          deviceId: device.deviceId,
          label: device.label,
          state: "quarantined" as const,
          heartbeatAt: null,
          operatingStatus: "unknown" as const,
          enrolmentState: "rejected" as const,
          newExecutionEligible: false,
          worker: null,
          leaseState: "rejected" as const,
          durableJob: null,
          reason: "Manifest integrity or registry binding was rejected.",
        }
      : classifyDevice(device, manifest, registry, input.keyResolver, nowMs),
  );
  const summary: Record<ControlPlaneState, number> = {
    observed: 0,
    stale: 0,
    offline: 0,
    quarantined: 0,
    unproven: 0,
  };
  for (const item of [...repositories, ...devices]) summary[item.state] += 1;
  const baseline = manifestRejected
    ? {
        state: "quarantined" as const,
        baselineId: null,
        recordedAt: null,
        evidenceSnapshotHash: null,
        reason:
          "Manifest integrity was rejected, so baseline evidence is unavailable.",
      }
    : classifyBaseline(manifest, registry, input.keyResolver, nowMs);
  const projectedJobIds = new Set(
    devices
      .map((device) => device.durableJob?.jobId)
      .filter((jobId): jobId is string => Boolean(jobId)),
  );
  const unknownJobs = (manifest?.jobs ?? [])
    .filter((envelope) => {
      const verified = verifyControlPlaneEnvelope(
        envelope,
        registry,
        input.keyResolver,
      );
      return (
        !verified.available ||
        !verified.valid ||
        !envelope.payload.assignedDeviceId ||
        !registry.devices.some(
          (device) => device.deviceId === envelope.payload.assignedDeviceId,
        ) ||
        !projectedJobIds.has(envelope.payload.jobId)
      );
    })
    .map((envelope) => ({
      recordHash: envelope.signature.recordHash,
      state: "unknown" as const,
      reason:
        "Job provenance, device assignment or current projection could not be verified; the record is preserved for reconciliation.",
    }));
  const orphanHeartbeatWork = (manifest?.deviceHeartbeats ?? [])
    .filter(
      (heartbeat) =>
        heartbeat.payload.activeJobId !== null &&
        !(manifest?.jobs ?? []).some(
          (job) => job.payload.jobId === heartbeat.payload.activeJobId,
        ),
    )
    .map((heartbeat) => ({
      recordHash: canonicalHash(heartbeat),
      state: "unknown" as const,
      reason:
        "A heartbeat references active work that has no durable job record; admission is denied and the heartbeat is preserved for reconciliation.",
    }));
  const unknownWork = [...unknownJobs, ...orphanHeartbeatWork];
  return {
    schema: PORTFOLIO_PROJECTION_SCHEMA,
    generatedAt: new Date(nowMs).toISOString(),
    mode: "read_only_local_candidate",
    remoteDispatchEnabled: false,
    repositoryReconciliationEnabled: false,
    externalMutationEnabled: false,
    registry: {
      state: "observed",
      version: registry.registryVersion,
      authority: registry.precedence.authority,
      reason: registry.precedence.rule,
    },
    baseline,
    summary,
    repositories,
    devices,
    unknownWork,
    nextSafeAction:
      summary.quarantined > 0
        ? "Preserve quarantined work and review each exact blocker before any repository action."
        : summary.unproven > 0 || summary.stale > 0 || summary.offline > 0
          ? "Refresh signed local observations and device heartbeats; keep dispatch and reconciliation disabled."
          : "Obtain independent exact-version review. No release or reconciliation is authorised by this projection.",
  };
}

export function assessNewExecutionAdmission(input: {
  registry: unknown;
  manifest: unknown;
  keyResolver: AttestationKeyResolver;
  deviceId: string;
  workerId: string;
  nowMs?: number;
}): { allowed: boolean; disposition: "eligible" | "denied"; reason: string } {
  const projection = buildPortfolioControlPlaneProjection(input);
  if (projection.baseline.state !== "baseline_in_progress")
    return {
      allowed: false,
      disposition: "denied",
      reason:
        "A verified FREEZE/BASELINE receipt is required before new work admission.",
    };
  const device = projection.devices.find(
    (candidate) => candidate.deviceId === input.deviceId,
  );
  if (!device)
    return {
      allowed: false,
      disposition: "denied",
      reason: "Device is not registered in the canonical portfolio registry.",
    };
  if (
    device.state !== "observed" ||
    device.enrolmentState !== "enrolled" ||
    !device.newExecutionEligible ||
    device.worker?.workerId !== input.workerId
  )
    return {
      allowed: false,
      disposition: "denied",
      reason:
        "Worker is unknown, stale, offline, unenrolled or has conflicting execution evidence.",
    };
  return {
    allowed: true,
    disposition: "eligible",
    reason:
      "Current signed heartbeat and exact Mission Control enrolment permit local admission; remote dispatch remains disabled.",
  };
}
