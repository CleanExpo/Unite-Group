export type CcTaskStatus =
  | 'proposed'
  | 'queued'
  | 'running'
  | 'blocked'
  | 'awaiting_approval'
  | 'done'
  | 'failed'

export type HermesTaskStatus =
  | 'archived'
  | 'blocked'
  | 'done'
  | 'ready'
  | 'review'
  | 'running'
  | 'scheduled'
  | 'todo'
  | 'triage'

export type OwnestGateState = 'eligible' | 'gated' | 'dead_letter'
declare const sha256DigestBrand: unique symbol
export type Sha256Digest = string & { readonly [sha256DigestBrand]: true }
declare const hmacSha256DigestBrand: unique symbol
export type HmacSha256Digest = string & { readonly [hmacSha256DigestBrand]: true }
declare const integrityNonceBrand: unique symbol
export type IntegrityNonce = string & { readonly [integrityNonceBrand]: true }
export type OwnestFailureClass = 'transient' | 'permanent' | 'integrity'
export type OwnestStopPhase = null | 'requested' | 'reclaimed' | 'unassigned' | 'archived'
export type OwnestCompletionPhase =
  | 'claimed'
  | 'dispatched'
  | 'receipt_validated'
  | 'artifacts_written'
  | 'terminal'

export interface OwnestStateV1 {
  version: 1
  crmTaskId: string
  idempotencyKey: string
  hermesTaskId: string | null
  attemptId: string
  leaseOwner: string
  leaseExpiresAt: string
  lastHeartbeatAt: string
  dispatchedAt: string | null
  reconciledAt: string | null
  evidenceUri: string | null
  gateState: OwnestGateState
  lastError: string | null
  claimedAt?: string
  rolloutId?: string
  hermesProfile?: string
  hermesBoard?: string
  integrityNonce?: IntegrityNonce
  missionDigest?: HmacSha256Digest
  failureCount?: number
  failureClass?: OwnestFailureClass | null
  failureCode?: string | null
  nextRetryAt?: string | null
  completionPhase?: OwnestCompletionPhase
  receiptSha256?: Sha256Digest | null
  cancelRequestedAt?: string | null
  cancelReason?: string | null
  stopPhase?: OwnestStopPhase
}

/** A post-amendment state with every integrity, projection, retry, and stop field persisted. */
export interface HardenedOwnestStateV1 extends OwnestStateV1 {
  claimedAt: string
  rolloutId: string
  hermesProfile: string
  hermesBoard: string
  integrityNonce: IntegrityNonce
  missionDigest: HmacSha256Digest
  failureCount: number
  failureClass: OwnestFailureClass | null
  failureCode: string | null
  nextRetryAt: string | null
  completionPhase: OwnestCompletionPhase
  receiptSha256: Sha256Digest | null
  cancelRequestedAt: string | null
  cancelReason: string | null
  stopPhase: OwnestStopPhase
}

export interface OwnestValidationRequirementV1 {
  readonly id: string
  readonly text: string
  readonly digest: HmacSha256Digest
}

export interface OwnestMissionContractV1 {
  readonly schema: 'ownest.mission.v1'
  readonly crmTaskId: string
  readonly attemptId: string
  readonly idempotencyKey: string
  readonly rolloutId: string
  readonly hermesProfile: string
  readonly hermesBoard: string
  readonly missionDigest: HmacSha256Digest
  readonly validationRequirements: readonly OwnestValidationRequirementV1[]
}

export type OwnestCompletionEvidenceKind =
  | 'source'
  | 'research'
  | 'test'
  | 'artifact'
  | 'commit'
  | 'report'

export interface OwnestCompletionEvidenceV1 {
  readonly id: string
  readonly kind: OwnestCompletionEvidenceKind
  readonly uri: string
  readonly digest: Sha256Digest
}

export interface OwnestCompletionValidationResultV1 {
  readonly requirementId: string
  readonly requirementDigest: HmacSha256Digest
  readonly status: 'passed'
  readonly evidenceIds: readonly string[]
}

export interface OwnestCompletionReceiptV1 {
  readonly schema: 'ownest.completion.v1'
  readonly crmTaskId: string
  readonly hermesTaskId: string
  readonly attemptId: string
  readonly rolloutId: string
  readonly missionDigest: HmacSha256Digest
  readonly verdict: 'passed'
  readonly evidence: readonly OwnestCompletionEvidenceV1[]
  readonly validationResults: readonly OwnestCompletionValidationResultV1[]
}

export interface HermesRunView {
  readonly id: number
  readonly profile: string | null
  readonly status: string
  readonly outcome: string | null
  readonly summary: string | null
  readonly error: string | null
  readonly metadata: Readonly<Record<string, unknown>> | null
  readonly workerPid: number | null
  readonly startedAt: number
  readonly endedAt: number | null
}

/** The cc_tasks fields required by the OWNEST worker. */
export interface CcTask {
  id: string
  founder_id: string
  title: string
  objective: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: CcTaskStatus
  agent_owner: string | null
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  execution_mode: 'advisory' | 'local-code' | 'branch-preview' | 'overnight'
  dependencies: string[]
  human_approval_required: boolean
  validation_required: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Normalised Hermes task returned by both create and show operations. */
export interface HermesTask {
  id: string
  status: HermesTaskStatus
  title: string
  assignee: string | null
  idempotencyKey: string | null
  summary: string | null
  runId: number | null
  completedAt: string | null
  receipt: OwnestCompletionReceiptV1 | null
  receiptSha256: Sha256Digest | null
  latestRun: HermesRunView | null
  evidenceUri: string | null
  error: string | null
}

export type OwnestStopCause =
  | 'cancel-requested'
  | 'authority-revoked'
  | 'lease-expired'
  | 'operator-stop'

export interface HermesTerminationMetadata {
  readonly prevPid: number | null
  readonly hostLocal: boolean
  readonly terminationAttempted: boolean
  readonly terminated: boolean
  readonly sigkill: boolean
}

export interface HermesStopResult {
  readonly outcome: 'stopped' | 'completed' | 'already-archived'
  readonly task: HermesTask
  readonly reclaimAttempted: boolean
  readonly safeToRedispatch: boolean
  readonly termination: HermesTerminationMetadata | null
}

/** Typed JSON envelope emitted by `hermes kanban create --json`. */
export interface HermesCreateResponse {
  task: HermesTask
  created: boolean
}

/** Typed JSON envelope emitted by `hermes kanban show --json`. */
export interface HermesShowResponse {
  task: HermesTask
}

export interface OwnestConfig {
  supabaseUrl: string
  serviceRoleKey: string
  founderId: string
  workerId: string
  hermesCwd: string
  hermesProfile: string
  hermesBoard: string
  rolloutId: string | null
  canaryTaskId: string | null
  live: boolean
  canaryLimit: number
  maxInProgress: number
  leaseMs: number
  dailyDispatchLimit: number
}

export type LoadOwnestConfigResult =
  | { ok: true; config: OwnestConfig }
  | { ok: false; error: string }

export interface ProcessResult {
  exitCode: number
  stdout: string
  stderr: string
}

export type ProcessRunner = (
  command: string,
  args: readonly string[],
  cwd: string,
) => Promise<ProcessResult>

/** Low-level dependency used by the fixed-argv Hermes adapter. */
export interface HermesDeps {
  run: ProcessRunner
}

/** Low-level dependency used by the PostgREST CRM adapter. */
export interface CrmDeps {
  fetch: typeof fetch
}

export interface CompareAndSetTaskInput {
  taskId: string
  expectedStatus: CcTaskStatus
  expectedUpdatedAt: string
  patch: Partial<Pick<CcTask, 'status' | 'metadata'>>
}

export type CcTaskEventType =
  | 'created'
  | 'status_changed'
  | 'approved'
  | 'blocked'
  | 'started'
  | 'completed'
  | 'failed'
  | 'evidence_added'
  | 'comment'
  | 'linear_synced'

export interface AppendOwnestEventInput {
  taskId: string
  type: CcTaskEventType
  actor?: string
  payload?: Record<string, unknown>
}

export type OwnestEvidenceKind =
  | 'brief'
  | 'research'
  | 'decision'
  | 'validation'
  | 'handoff'
  | 'daily'

export interface AppendOwnestEvidenceInput {
  taskId: string
  wikiPath: string
  kind?: OwnestEvidenceKind
  sources?: readonly unknown[]
  confidence?: 'high' | 'medium' | 'low'
}

/** Founder-scoped CRM operations consumed by the pure tick state machine. */
export interface OwnestCrmClient {
  listCandidateTasks: () => Promise<CcTask[]>
  listMirroredTasks: () => Promise<CcTask[]>
  getOwnedTask: (taskId: string) => Promise<CcTask | null>
  listManagedTasks: () => Promise<CcTask[]>
  countRolloutClaims: (rolloutId: string) => Promise<number>
  countDailyClaims: (fromIso: string, toIso: string) => Promise<number>
  compareAndSetTask: (input: CompareAndSetTaskInput) => Promise<CcTask | null>
  appendTaskEvent: (input: AppendOwnestEventInput) => Promise<void>
  appendEvidence: (input: AppendOwnestEvidenceInput) => Promise<void>
}

/** Idempotent Hermes operations consumed by the pure tick state machine. */
export interface OwnestHermesClient {
  createMission: (task: CcTask, contract: OwnestMissionContractV1) => Promise<HermesTask>
  showMission: (
    taskId: string,
    expectedContract: OwnestMissionContractV1,
  ) => Promise<HermesTask>
  stopMission: (
    hermesTaskId: string,
    expectedContract: OwnestMissionContractV1,
    cause: OwnestStopCause,
  ) => Promise<HermesStopResult>
}

export interface OwnestTickDeps {
  crm: OwnestCrmClient
  hermes: OwnestHermesClient
  now: () => Date
  randomUUID: () => string
}

export type OwnestTickOutcome =
  | 'drained'
  | 'idle'
  | 'dispatched'
  | 'reconciled'
  | 'blocked'
  | 'failed'

export interface OwnestTickSummary {
  outcome: OwnestTickOutcome
  reconciled: number
  dispatched: number
  taskId?: string
  error?: string
}
