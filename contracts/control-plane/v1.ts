/**
 * UNI-2403 — canonical run / lane / tool-event contract, version 1.
 *
 * ONE control-plane source of truth for the Mission Control identity chain:
 *
 *   founder request → Linear task → operator job → lane → machine
 *                   → CLI process → tool call → test/PR evidence
 *
 * This file introduces NO queue, NO executor and NO new state machine. It is a
 * declaration layer: the canonical run states and their legal transitions, the
 * event envelope every producer must eventually emit, the redaction boundary,
 * and a registry that maps every state machine already shipped in
 * `apps/web`, `apps/workspace` and `apps/autopilot-runner` onto that canonical
 * vocabulary.
 *
 * The registry is the audit. `scripts/control-plane-contract.mjs` reads each
 * registered declaration back out of its source file and fails when the source
 * and this contract disagree — so a new or renamed status cannot land silently,
 * and two hand-copied declarations cannot drift apart unnoticed.
 *
 * Written with erasable-only TypeScript syntax so Node's native type stripping
 * can import the runtime constants directly (no build step, no new package).
 *
 * Scope boundary (deliberate, see docs/contracts/control-plane-v1.md §6):
 * the audit covers the files listed in `CONTROL_PLANE_SOURCES`. It does not
 * claim to cover every status union in the monorepo.
 */

export const CONTRACT_SCHEMA_VERSION = 'control-plane/v1'

// ─── Identity chain ───────────────────────────────────────────────────────────

/** Ordered identity chain. Each link may only appear once its parent is set. */
export const IDENTITY_CHAIN = [
  'founderRequestId',
  'linearTaskId',
  'operatorJobId',
  'laneId',
  'machineId',
  'processId',
  'toolCallId',
] as const

export type IdentityKey = (typeof IDENTITY_CHAIN)[number]

export interface ControlPlaneIdentity {
  /** Root of every chain: the founder instruction that authorised the work. */
  founderRequestId: string
  linearTaskId?: string
  operatorJobId?: string
  laneId?: string
  machineId?: string
  /** Supervised CLI process (process-group leader), not a bare PID reference. */
  processId?: string
  toolCallId?: string
  /** Test / PR / receipt references produced under this identity. */
  evidenceRefs?: readonly string[]
}

/**
 * Report every place an identity skips a link in the chain. A `laneId` with no
 * `operatorJobId` means two control planes are in play, which is exactly what
 * UNI-2403 exists to prevent — so it is a violation, not a warning.
 */
export function findIdentityChainGaps(identity: Record<string, unknown>): string[] {
  const gaps: string[] = []
  let brokenAt: string | null = null
  for (const key of IDENTITY_CHAIN) {
    const present = typeof identity[key] === 'string' && (identity[key] as string).length > 0
    if (present && brokenAt) {
      gaps.push(`${key} is set but ${brokenAt} is missing`)
    }
    if (!present && !brokenAt) {
      brokenAt = key
    }
  }
  return gaps
}

// ─── Canonical run states ─────────────────────────────────────────────────────

/** The nine canonical run states. No producer may invent a tenth. */
export type RunState =
  | 'queued'
  | 'claimed'
  | 'running'
  | 'paused'
  | 'blocked'
  | 'stopping'
  | 'stopped'
  | 'done'
  | 'failed'

export const RUN_STATES: readonly RunState[] = [
  'queued',
  'claimed',
  'running',
  'paused',
  'blocked',
  'stopping',
  'stopped',
  'done',
  'failed',
] as const

/** Terminal states have no outgoing transition. */
export const TERMINAL_RUN_STATES: readonly RunState[] = ['stopped', 'done', 'failed'] as const

export const LEGAL_TRANSITIONS: Readonly<Record<RunState, readonly RunState[]>> = {
  queued: ['claimed', 'blocked', 'stopped', 'failed'],
  claimed: ['running', 'blocked', 'stopping', 'failed'],
  running: ['paused', 'blocked', 'stopping', 'done', 'failed'],
  paused: ['running', 'blocked', 'stopping', 'failed'],
  blocked: ['queued', 'running', 'stopping', 'stopped', 'failed'],
  stopping: ['stopped', 'failed'],
  stopped: [],
  done: [],
  failed: [],
}

export function isRunState(value: unknown): value is RunState {
  return typeof value === 'string' && (RUN_STATES as readonly string[]).includes(value)
}

export function isLegalTransition(from: unknown, to: unknown): boolean {
  if (!isRunState(from) || !isRunState(to)) return false
  return (LEGAL_TRANSITIONS[from] as readonly string[]).includes(to)
}

// ─── Event envelope ───────────────────────────────────────────────────────────

export type RunEventKind =
  | 'lifecycle'
  | 'control'
  | 'output'
  | 'tool_call'
  | 'evidence'
  | 'annotation'
  | 'error'

export const RUN_EVENT_KINDS: readonly RunEventKind[] = [
  'lifecycle',
  'control',
  'output',
  'tool_call',
  'evidence',
  'annotation',
  'error',
] as const

/**
 * Every control-plane event carries its source, its timestamp and the contract
 * version it was written against. Without all three, a replayed ledger cannot
 * be attributed or migrated.
 */
export interface RunEventEnvelope {
  schemaVersion: string
  /** Producing surface, e.g. `apps/workspace:lanes/cli-adapter`. */
  source: string
  /** ISO-8601 UTC instant. */
  occurredAt: string
  /** Monotonic, 1-based, per run. */
  sequence: number
  runId: string
  kind: RunEventKind
  fromState?: RunState
  toState?: RunState
  /** Redacted and bounded. Never raw process output. */
  message: string
}

export const REQUIRED_ENVELOPE_FIELDS = [
  'schemaVersion',
  'source',
  'occurredAt',
  'sequence',
  'runId',
  'kind',
  'message',
] as const

export type EnvelopeField = (typeof REQUIRED_ENVELOPE_FIELDS)[number]

export const MAX_EVENT_MESSAGE_LENGTH = 4_000

/** Report every reason a value is not a legal event envelope. Never throws. */
export function findEnvelopeViolations(event: unknown): string[] {
  if (typeof event !== 'object' || event === null || Array.isArray(event)) {
    return ['event is not an object']
  }
  const e = event as Record<string, unknown>
  const violations: string[] = []

  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    if (e[field] === undefined || e[field] === null) violations.push(`${field} is missing`)
  }
  if (e.schemaVersion !== undefined && e.schemaVersion !== CONTRACT_SCHEMA_VERSION) {
    violations.push(`schemaVersion must be '${CONTRACT_SCHEMA_VERSION}'`)
  }
  if (e.source !== undefined && (typeof e.source !== 'string' || e.source.trim() === '')) {
    violations.push('source must be a non-empty string')
  }
  if (e.occurredAt !== undefined && !isIsoInstant(e.occurredAt)) {
    violations.push('occurredAt must be an ISO-8601 UTC instant')
  }
  if (
    e.sequence !== undefined &&
    (typeof e.sequence !== 'number' || !Number.isInteger(e.sequence) || e.sequence < 1)
  ) {
    violations.push('sequence must be a positive integer')
  }
  if (e.runId !== undefined && (typeof e.runId !== 'string' || e.runId === '')) {
    violations.push('runId must be a non-empty string')
  }
  if (e.kind !== undefined && !(RUN_EVENT_KINDS as readonly unknown[]).includes(e.kind)) {
    violations.push('kind is not a canonical RunEventKind')
  }
  if (e.message !== undefined && typeof e.message !== 'string') {
    violations.push('message must be a string')
  } else if (typeof e.message === 'string' && e.message.length > MAX_EVENT_MESSAGE_LENGTH) {
    violations.push(`message exceeds ${MAX_EVENT_MESSAGE_LENGTH} characters`)
  }
  if (e.fromState !== undefined && !isRunState(e.fromState)) {
    violations.push('fromState is not a canonical RunState')
  }
  if (e.toState !== undefined && !isRunState(e.toState)) {
    violations.push('toState is not a canonical RunState')
  }
  if (
    e.fromState !== undefined &&
    e.toState !== undefined &&
    isRunState(e.fromState) &&
    isRunState(e.toState) &&
    !isLegalTransition(e.fromState, e.toState)
  ) {
    violations.push(`transition ${String(e.fromState)} → ${String(e.toState)} is not legal`)
  }
  return violations
}

function isIsoInstant(value: unknown): boolean {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}

// ─── Redaction boundary ───────────────────────────────────────────────────────

/**
 * The redaction rule is STRUCTURAL: a producer must never hand a credential to
 * the event layer in the first place. `SECRET_SHAPES` below is a tripwire for
 * defence in depth, not the boundary itself — a deny-list cannot prove absence.
 * `ENVELOPE_LEDGER` records which producers currently pass through a redactor;
 * see docs/contracts/control-plane-v1.md §5 for the outstanding gaps.
 */
export const REDACTION_PLACEHOLDER = '[redacted]'

export const SECRET_SHAPES: readonly { name: string; pattern: RegExp }[] = [
  { name: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/g },
  { name: 'sk-key', pattern: /\bsk-[A-Za-z0-9_-]{16,}/g },
  { name: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{16,}/g },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { name: 'assigned-secret', pattern: /\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*[=:]\s*\S+/g },
]

/** Names of every secret shape present in `text`. Empty is NOT proof of safety. */
export function findSecretShapes(text: string): string[] {
  const hits: string[] = []
  for (const { name, pattern } of SECRET_SHAPES) {
    if (new RegExp(pattern.source, pattern.flags.replace('g', '')).test(text)) hits.push(name)
  }
  return hits
}

/** Replace every secret-shaped span, then bound the result. */
export function redact(text: string): string {
  let out = text
  for (const { pattern } of SECRET_SHAPES) {
    out = out.replace(new RegExp(pattern.source, pattern.flags), REDACTION_PLACEHOLDER)
  }
  return out.length > MAX_EVENT_MESSAGE_LENGTH
    ? `${out.slice(0, MAX_EVENT_MESSAGE_LENGTH - 1)}…`
    : out
}

// ─── Registry: every shipped state machine, mapped ────────────────────────────

/**
 * A state machine already shipped in the monorepo. `mapping` sends each member
 * to a canonical `RunState`, or to `null` when the member is honestly not a run
 * state (a catalogue entry, a presence signal, a pre-admission draft). Every
 * `null` must carry its reason in `offRunReasons`.
 */
export interface RegisteredStateMachine {
  id: string
  file: string
  typeName: string
  members: readonly string[]
  mapping: Readonly<Record<string, RunState | null>>
  offRunReasons?: Readonly<Record<string, string>>
  /** Another registry id this declaration must stay member-identical to. */
  duplicateOf?: string
  notes?: string
}

export const REGISTERED_STATE_MACHINES: readonly RegisteredStateMachine[] = [
  {
    id: 'operator-job-status',
    file: 'apps/web/src/lib/operator-gateway/jobs.ts',
    typeName: 'OperatorJobStatus',
    members: ['planned', 'queued', 'running', 'blocked', 'done', 'failed', 'cancelled'],
    mapping: {
      planned: null,
      queued: 'queued',
      running: 'running',
      blocked: 'blocked',
      done: 'done',
      failed: 'failed',
      cancelled: 'stopped',
    },
    offRunReasons: { planned: 'proposal recorded before admission; no run exists yet' },
  },
  {
    id: 'cc-task-status',
    file: 'apps/web/src/lib/command-centre/tasks.ts',
    typeName: 'TaskStatus',
    members: [
      'proposed',
      'queued',
      'running',
      'blocked',
      'awaiting_approval',
      'done',
      'failed',
    ],
    mapping: {
      proposed: null,
      queued: 'queued',
      running: 'running',
      blocked: 'blocked',
      awaiting_approval: 'blocked',
      done: 'done',
      failed: 'failed',
    },
    offRunReasons: { proposed: 'task drafted but not admitted; no run exists yet' },
    notes: 'awaiting_approval is blocked-on-founder, not a distinct run state.',
  },
  {
    id: 'cc-task-status-runner',
    file: 'apps/autopilot-runner/src/ownest/types.ts',
    typeName: 'CcTaskStatus',
    members: [
      'proposed',
      'queued',
      'running',
      'blocked',
      'awaiting_approval',
      'done',
      'failed',
    ],
    mapping: {
      proposed: null,
      queued: 'queued',
      running: 'running',
      blocked: 'blocked',
      awaiting_approval: 'blocked',
      done: 'done',
      failed: 'failed',
    },
    offRunReasons: { proposed: 'task drafted but not admitted; no run exists yet' },
    duplicateOf: 'cc-task-status',
    notes: 'Hand-copied from apps/web cc_tasks. The audit fails if the two drift.',
  },
  {
    id: 'hermes-task-status',
    file: 'apps/autopilot-runner/src/ownest/types.ts',
    typeName: 'HermesTaskStatus',
    members: [
      'archived',
      'blocked',
      'done',
      'ready',
      'review',
      'running',
      'scheduled',
      'todo',
      'triage',
    ],
    mapping: {
      archived: 'stopped',
      blocked: 'blocked',
      done: 'done',
      ready: 'queued',
      review: 'blocked',
      running: 'running',
      scheduled: 'queued',
      todo: null,
      triage: null,
    },
    offRunReasons: {
      todo: 'Hermes backlog column; never admitted to a run',
      triage: 'Hermes intake column; never admitted to a run',
    },
    notes: 'Foreign vocabulary owned by Hermes. Mapped, never mirrored.',
  },
  {
    id: 'ownest-completion-phase',
    file: 'apps/autopilot-runner/src/ownest/types.ts',
    typeName: 'OwnestCompletionPhase',
    members: ['claimed', 'dispatched', 'receipt_validated', 'artifacts_written', 'terminal'],
    mapping: {
      claimed: 'claimed',
      dispatched: 'running',
      receipt_validated: 'running',
      artifacts_written: 'running',
      terminal: 'done',
    },
    notes: 'Sole current producer of the canonical `claimed` state.',
  },
  {
    id: 'ownest-stop-phase',
    file: 'apps/autopilot-runner/src/ownest/types.ts',
    typeName: 'OwnestStopPhase',
    members: ['requested', 'reclaimed', 'unassigned', 'archived'],
    mapping: {
      requested: 'stopping',
      reclaimed: 'stopping',
      unassigned: 'stopped',
      archived: 'stopped',
    },
    notes: 'Declaration also admits `null` (no stop in flight); null is not a member.',
  },
  {
    id: 'ownest-gate-state',
    file: 'apps/autopilot-runner/src/ownest/types.ts',
    typeName: 'OwnestGateState',
    members: ['eligible', 'gated', 'dead_letter'],
    mapping: { eligible: null, gated: null, dead_letter: null },
    offRunReasons: {
      eligible: 'admission verdict, evaluated before a run exists',
      gated: 'admission verdict, evaluated before a run exists',
      dead_letter: 'admission verdict, evaluated before a run exists',
    },
  },
  {
    id: 'lane-runtime-status',
    file: 'apps/workspace/src/server/lanes/types.ts',
    typeName: 'LaneStatus',
    members: ['creating', 'idle', 'running', 'stopping', 'blocked', 'error', 'stopped'],
    mapping: {
      creating: null,
      idle: null,
      running: 'running',
      stopping: 'stopping',
      blocked: 'blocked',
      error: 'failed',
      stopped: 'stopped',
    },
    offRunReasons: {
      creating: 'lane worktree being provisioned; no run exists yet',
      idle: 'lane exists with no active run',
    },
    notes:
      'NAME COLLISION with lane-install-status: two different axes share the identifier `LaneStatus`.',
  },
  {
    id: 'lane-run-status',
    file: 'apps/workspace/src/server/lanes/types.ts',
    typeName: 'LaneRunStatus',
    members: ['running', 'succeeded', 'failed', 'stopping', 'stopped'],
    mapping: {
      running: 'running',
      succeeded: 'done',
      failed: 'failed',
      stopping: 'stopping',
      stopped: 'stopped',
    },
    notes: 'Says `succeeded` where every other surface says `done`.',
  },
  {
    id: 'lane-install-status',
    file: 'apps/web/src/lib/operator-gateway/lanes.ts',
    typeName: 'LaneStatus',
    members: ['active', 'design_only', 'not_installed', 'disabled'],
    mapping: { active: null, design_only: null, not_installed: null, disabled: null },
    offRunReasons: {
      active: 'lane catalogue installation state, not a run state',
      design_only: 'lane catalogue installation state, not a run state',
      not_installed: 'lane catalogue installation state, not a run state',
      disabled: 'lane catalogue installation state, not a run state',
    },
    notes: 'NAME COLLISION with lane-runtime-status.',
  },
  {
    id: 'execution-session-status',
    file: 'apps/web/src/lib/command-centre/sessions.ts',
    typeName: 'SessionStatus',
    members: ['running', 'paused', 'done', 'failed'],
    mapping: { running: 'running', paused: 'paused', done: 'done', failed: 'failed' },
    notes: 'Sole current producer of the canonical `paused` state.',
  },
  {
    id: 'crm-mission-control-state',
    file: 'apps/web/src/lib/crm/mission-control-execution.ts',
    typeName: 'CrmMissionControlState',
    members: ['queued', 'approved', 'executing', 'executed', 'failed', 'needs_review'],
    mapping: {
      queued: 'queued',
      approved: 'queued',
      executing: 'running',
      executed: 'done',
      failed: 'failed',
      needs_review: 'blocked',
    },
    notes: 'Founder-facing labels over the operator_jobs machine; not a second queue.',
  },
  {
    id: 'crm-operator-outcome-status',
    file: 'apps/web/src/lib/crm/mission-control-execution.ts',
    typeName: 'CrmOperatorOutcomeStatus',
    members: ['running', 'done', 'failed'],
    mapping: { running: 'running', done: 'done', failed: 'failed' },
    notes:
      'Declaration also unions `typeof CRM_OPERATOR_JOB_STATUS`, which this audit cannot read; only the literal members are pinned.',
  },
  {
    id: 'agent-connection-state',
    file: 'apps/web/src/lib/operator-gateway/presence.ts',
    typeName: 'AgentConnectionState',
    members: ['connected', 'stale', 'offline'],
    mapping: { connected: null, stale: null, offline: null },
    offRunReasons: {
      connected: 'machine presence signal, not a run state',
      stale: 'machine presence signal, not a run state',
      offline: 'machine presence signal, not a run state',
    },
  },
  {
    id: 'gateway-health-state',
    file: 'apps/web/src/lib/operator-gateway/presence.ts',
    typeName: 'GatewayHealthState',
    members: ['running', 'unreachable', 'unknown'],
    mapping: { running: null, unreachable: null, unknown: null },
    offRunReasons: {
      running: 'gateway process health, not a run state',
      unreachable: 'gateway process health, not a run state',
      unknown: 'gateway process health, not a run state',
    },
    notes: '`running` here means "the gateway answered", not "a run is executing".',
  },
]

// ─── Registry: event vocabularies ─────────────────────────────────────────────

export interface RegisteredEventType {
  id: string
  file: string
  typeName: string
  members: readonly string[]
  /** Each member mapped onto a canonical `RunEventKind`. */
  mapping: Readonly<Record<string, RunEventKind>>
  duplicateOf?: string
  notes?: string
}

const TASK_EVENT_MEMBERS = [
  'created',
  'status_changed',
  'approved',
  'blocked',
  'started',
  'completed',
  'failed',
  'evidence_added',
  'comment',
  'linear_synced',
] as const

const TASK_EVENT_MAPPING: Readonly<Record<string, RunEventKind>> = {
  created: 'lifecycle',
  status_changed: 'lifecycle',
  approved: 'control',
  blocked: 'control',
  started: 'lifecycle',
  completed: 'lifecycle',
  failed: 'error',
  evidence_added: 'evidence',
  comment: 'annotation',
  linear_synced: 'lifecycle',
}

export const REGISTERED_EVENT_TYPES: readonly RegisteredEventType[] = [
  {
    id: 'operator-event-type',
    file: 'apps/web/src/lib/operator-gateway/jobs.ts',
    typeName: 'OperatorEventType',
    members: ['created', 'status_changed', 'evidence_added', 'gate_blocked', 'note'],
    mapping: {
      created: 'lifecycle',
      status_changed: 'lifecycle',
      evidence_added: 'evidence',
      gate_blocked: 'control',
      note: 'annotation',
    },
  },
  {
    id: 'cc-task-event-type',
    file: 'apps/web/src/lib/command-centre/tasks.ts',
    typeName: 'TaskEventType',
    members: TASK_EVENT_MEMBERS,
    mapping: TASK_EVENT_MAPPING,
  },
  {
    id: 'cc-task-event-type-runner',
    file: 'apps/autopilot-runner/src/ownest/types.ts',
    typeName: 'CcTaskEventType',
    members: TASK_EVENT_MEMBERS,
    mapping: TASK_EVENT_MAPPING,
    duplicateOf: 'cc-task-event-type',
    notes: 'Hand-copied from apps/web cc_task_events. The audit fails if the two drift.',
  },
  {
    id: 'lane-run-event-type',
    file: 'apps/workspace/src/server/lanes/types.ts',
    typeName: 'LaneRunEventType',
    members: ['lifecycle', 'stdout', 'stderr', 'control', 'error'],
    mapping: {
      lifecycle: 'lifecycle',
      stdout: 'output',
      stderr: 'output',
      control: 'control',
      error: 'error',
    },
    notes: 'No `tool_call` or `evidence` producer yet; see contract doc §5.',
  },
]

// ─── Envelope compliance ledger (honest gap record) ───────────────────────────

/**
 * What each shipped event shape actually carries today, field by field. A
 * string names the existing field that satisfies the requirement; `false` means
 * the requirement is NOT met. This is a debt ledger, not a compliance claim —
 * the audit fails if a shape is added without an entry, or if an entry claims a
 * field the source does not declare.
 */
export interface EnvelopeCompliance {
  id: string
  file: string
  interfaceName: string
  fields: Readonly<Record<EnvelopeField, string | false>>
  /** True only when the producer routes messages through a redactor. */
  redactsMessages: boolean
  notes?: string
}

export const ENVELOPE_LEDGER: readonly EnvelopeCompliance[] = [
  {
    id: 'operator-event',
    file: 'apps/web/src/lib/operator-gateway/jobs.ts',
    interfaceName: 'OperatorEvent',
    fields: {
      schemaVersion: false,
      source: false,
      occurredAt: 'at',
      sequence: false,
      runId: 'jobId',
      kind: 'eventType',
      message: 'detail',
    },
    redactsMessages: false,
    notes: 'runId is satisfied by jobId: operator jobs have no separate run identity yet.',
  },
  {
    id: 'task-event',
    file: 'apps/web/src/lib/command-centre/tasks.ts',
    interfaceName: 'TaskEvent',
    fields: {
      schemaVersion: false,
      source: 'actor',
      occurredAt: 'at',
      sequence: false,
      runId: 'task_id',
      kind: 'type',
      message: 'payload',
    },
    redactsMessages: false,
    notes: '`actor` names who, not which surface; `payload` is unbounded JSON.',
  },
  {
    id: 'lane-run-event',
    file: 'apps/workspace/src/server/lanes/types.ts',
    interfaceName: 'LaneRunEvent',
    fields: {
      schemaVersion: false,
      source: false,
      occurredAt: 'occurredAt',
      sequence: 'sequence',
      runId: 'runId',
      kind: 'type',
      message: 'message',
    },
    redactsMessages: true,
    notes: 'Closest shape to the canonical envelope; redaction lives in the CLI adapter.',
  },
  {
    id: 'lane-stream-event',
    file: 'apps/workspace/src/server/lanes/event-stream.ts',
    interfaceName: 'LaneStreamEvent',
    fields: {
      schemaVersion: 'schemaVersion',
      source: 'source',
      occurredAt: 'occurredAt',
      sequence: 'sequence',
      runId: 'runId',
      kind: 'kind',
      message: 'message',
    },
    redactsMessages: true,
    notes:
      'UNI-2406. The first shape to satisfy the envelope in full, and it does so by extending RunEventEnvelope rather than re-declaring it. Redaction runs in the splitter before the sink is called, and the producer refuses to emit anything findEnvelopeViolations rejects.',
  },
]

// ─── Audit scope ──────────────────────────────────────────────────────────────

/**
 * The files the duplicate-control-system audit reads. Claims from this audit are
 * bounded to these files — it does not sweep the whole monorepo.
 */
export const CONTROL_PLANE_SOURCES: readonly string[] = [
  'apps/web/src/lib/operator-gateway/jobs.ts',
  'apps/web/src/lib/operator-gateway/lanes.ts',
  'apps/web/src/lib/operator-gateway/presence.ts',
  'apps/web/src/lib/command-centre/tasks.ts',
  'apps/web/src/lib/command-centre/sessions.ts',
  'apps/web/src/lib/crm/mission-control-execution.ts',
  'apps/workspace/src/server/lanes/types.ts',
  'apps/workspace/src/server/lanes/event-stream.ts',
  'apps/autopilot-runner/src/ownest/types.ts',
]

/**
 * Unions inside `CONTROL_PLANE_SOURCES` whose names match the audit's suffixes
 * but which are deliberately outside the run/lane/event contract.
 */
export const AUDIT_EXEMPTIONS: Readonly<Record<string, string>> = {}

/** Name suffixes the audit treats as a lifecycle declaration. */
export const AUDITED_TYPE_SUFFIXES: readonly string[] = [
  'Status',
  'State',
  'Phase',
  'EventType',
] as const
