/**
 * UNI-2951 Phase 4: headless, event-sourced world service around the UNI-2774 reducer.
 * Rules live ONLY in the service: ../scenario (reduceWorld) for world rules, and the permission check
 * below for who may send a command. The service keeps an append-only log of accepted commands, can
 * rebuild state from that log, and records an audit entry for every permission denial. A separate attempt
 * log records EVERY command and control attempt (accepted, replayed or rejected) with actor, outcome, HTTP
 * status and the state after it, so a client's record of a run can be checked against what the service saw.
 * It never accepts state from a client.
 *
 * Identity: local TEST identities only (BRIEF decision 9). No real identity, no credentials. The player's identity holds the
 * scenario roles; at L3 each fictional person also has one test identity, and their L3 roles come from the business's people
 * list, checked against the permission table below. This is not the real identity model (D-identity still blocks L23, L24).
 *
 * Two modes:
 *  - 'live': normal commands only. Privileged controls do not exist.
 *  - 'test': the isolated test service. Privileged controls: reset (back to the initial world, with an
 *    empty log), and fixture/goto, which replay ORDINARY commands through the same permission and
 *    reducer checks. No control can write arbitrary state.
 */
import { createWorld, deepFreeze, reduceWorld, replayLog, type Stage, type WorldResult, type WorldState } from '../scenario'
import { CANDIDATES, employmentRecord, PLAYER_ID, STAFF, STAFF_ROLES, type EmploymentRecord, type Role } from '../workforce'

export type ServiceMode = 'live' | 'test'

export interface Identity {
  readonly id: string
  /** The scenario roles (L1, L2). */
  readonly roles: readonly string[]
  /** L3: the person this identity acts as, in the business's people list. Their L3 roles are read from that list. */
  readonly personId?: string
}

/** The player's local test identity. Fictional. */
export const LOCAL_TEST_IDENTITY: Identity = Object.freeze({ id: 'local-test-identity', roles: Object.freeze(['technician', 'owner']), personId: PLAYER_ID })

/** L3: one test identity for each fictional person the owner can add or hire. No scenario roles. */
export const PEOPLE_TEST_IDENTITIES: readonly Identity[] = Object.freeze(
  [...STAFF, ...STAFF_ROLES.flatMap(role => CANDIDATES[role])]
    .map(p => Object.freeze({ id: `test-identity-${p.id}`, roles: Object.freeze([] as string[]), personId: p.id })))

export type L3Action = 'add-person' | 'change-roles' | 'post-vacancy' | 'hire-candidate' | 'read-people' | 'read-record-any' | 'read-record-own'

/**
 * L3 permission table, approved by the founder 16/11/2026. For each action, the roles allowed. The service is the only
 * place this rule lives: the client shows only the actions GET /permissions returns for the acting identity.
 */
export const PERMISSIONS: Readonly<Record<L3Action, readonly Role[]>> = Object.freeze({
  'add-person': Object.freeze(['owner'] as Role[]),
  'change-roles': Object.freeze(['owner'] as Role[]),
  'hire-candidate': Object.freeze(['owner'] as Role[]),
  'post-vacancy': Object.freeze(['owner', 'administrator'] as Role[]),
  'read-people': Object.freeze(['owner', 'senior-technician', 'administrator'] as Role[]),
  'read-record-any': Object.freeze(['owner', 'administrator'] as Role[]),
  'read-record-own': Object.freeze(['senior-technician'] as Role[]),
})

const L3_COMMANDS: ReadonlySet<string> = new Set(['add-person', 'change-roles', 'post-vacancy', 'hire-candidate'])

export interface AuditEntry {
  readonly seq: number
  readonly actor: string | null
  readonly commandId: string | null
  readonly reason: 'unknown-actor' | 'missing-role' | 'not-permitted'
  /** L3: set on a refused record read, the person whose record was asked for. */
  readonly target?: string
}

export type ServiceResult =
  | WorldResult
  | { ok: false; code: 'permission-denied'; reason: AuditEntry['reason']; state: WorldState }

export type PermissionsResult =
  | { ok: true; actor: string; personId: string | null; roles: readonly Role[]; actions: readonly L3Action[] }
  | { ok: false; code: 'permission-denied'; reason: 'unknown-actor' }

export type RecordResult =
  | { ok: true; record: EmploymentRecord }
  | { ok: false; code: 'permission-denied'; reason: 'unknown-actor' | 'not-permitted' }
  | { ok: false; code: 'not-found' }

/** HTTP status for a result. 200 accepted or idempotent replay; 400 bad command or refused address; 403 permission; 409 conflicts. */
export function statusFor(result: { ok: boolean; code?: string }): number {
  if (result.ok) return 200
  if (result.code === 'invalid-command' || result.code === 'invalid-address') return 400
  if (result.code === 'permission-denied') return 403
  if (result.code === 'not-found') return 404
  return 409
}

/**
 * One entry per attempt, accepted OR rejected, in arrival order (append-only, never cleared, not even by reset).
 * `command` entries are every command the service received (including permission denials, malformed bodies and
 * idempotent replays); `control` entries are the privileged test controls (reset, fixture, goto). `state` is the
 * world state the service held after the attempt. The test evidence route returns this log so a client's own
 * record of a run can be checked against it field for field.
 */
export interface AttemptEntry {
  readonly seq: number
  readonly kind: 'command' | 'control'
  /** The acting identity for a command (null when none was sent); null for controls. */
  readonly actor: string | null
  /** The command exactly as received (null when the body could not be parsed); the argument for a control. */
  readonly input: unknown
  /** 'reset' | 'fixture' | 'goto' for controls; null for commands. */
  readonly control: 'reset' | 'fixture' | 'goto' | null
  readonly outcome: 'accepted' | 'replayed' | 'rejected'
  readonly code: string | null
  readonly reason: string | null
  readonly status: number
  readonly state: WorldState
}

/** The role a command needs. Only the business profile is an owner action at L1; everything else is the scenario role. */
function requiredRole(input: unknown, state: WorldState): string {
  const type = input && typeof input === 'object' ? (input as { type?: unknown }).type : undefined
  return type === 'create-business' ? 'owner' : state.role
}

export class PrivilegedControlRefused extends Error {
  constructor() {
    super('privileged control refused: only the isolated test service accepts it')
    this.name = 'PrivilegedControlRefused'
  }
}

/** Canonical command path used by the test-only `goto` control. Ordinary commands, nothing else. */
const GOTO_PATH: Record<Stage, readonly unknown[]> = {
  briefing: [],
  consequence: [{ id: 'goto-decide', expectedRevision: 0, type: 'decide', choice: 'seek-support' }],
  reflected: [
    { id: 'goto-decide', expectedRevision: 0, type: 'decide', choice: 'seek-support' },
    { id: 'goto-reflect', expectedRevision: 1, type: 'reflect' },
  ],
  complete: [
    { id: 'goto-decide', expectedRevision: 0, type: 'decide', choice: 'seek-support' },
    { id: 'goto-reflect', expectedRevision: 1, type: 'reflect' },
    { id: 'goto-complete', expectedRevision: 2, type: 'complete' },
  ],
}

export class WorldService {
  private state: WorldState = createWorld()
  private readonly log: unknown[] = []
  private readonly auditLog: AuditEntry[] = []
  private readonly attemptLog: AttemptEntry[] = []
  private readonly identities: ReadonlyMap<string, Identity>

  constructor(readonly mode: ServiceMode, identities: readonly Identity[] = [LOCAL_TEST_IDENTITY, ...PEOPLE_TEST_IDENTITIES]) {
    if (mode !== 'live' && mode !== 'test') throw new Error(`unknown service mode: ${String(mode)}`)
    this.identities = new Map(identities.map(identity => [identity.id, identity]))
  }

  get current(): WorldState {
    return this.state
  }

  /** Copy of the accepted-command log (the event stream). */
  get events(): readonly unknown[] {
    return this.log.slice()
  }

  /** Copy of the permission-denial audit log. */
  get audit(): readonly AuditEntry[] {
    return this.auditLog.slice()
  }

  /** Copy of the attempt log: every command and control attempt, accepted or rejected, with the state after it. */
  get attempts(): readonly AttemptEntry[] {
    return this.attemptLog.slice()
  }

  /**
   * Normal command path: permission check, then reduceWorld with identical semantics.
   * The acting identity must exist and hold the role the command needs: 'owner' for create-business (L1),
   * otherwise the role the scenario is played in (state.role).
   * Accepted commands are appended to the log; denials are appended to the audit log; every attempt
   * (including rejected ones) is appended to the attempt log.
   */
  handle(input: unknown, actor: unknown): ServiceResult {
    const result = this.decide(input, actor)
    this.recordAttempt('command', typeof actor === 'string' ? actor : null, input, null, result)
    return result
  }

  /** A request that failed before it became a command (unparseable or oversized body). Logged, changes nothing. */
  recordTransportReject(actor: unknown, status: number): void {
    this.recordAttempt('command', typeof actor === 'string' ? actor : null, null, null,
      { ok: false, code: 'invalid-command', state: this.state }, status)
  }

  /** A privileged control request that failed before it ran (unparseable or oversized body). Logged, changes nothing. */
  recordControlTransportReject(control: NonNullable<AttemptEntry['control']>, status: number): void {
    this.requireTest()
    this.recordAttempt('control', null, null, control, { ok: false, code: 'invalid-command', state: this.state }, status)
  }

  private decide(input: unknown, actor: unknown): ServiceResult {
    const identity = this.identityOf(actor)
    const type = input && typeof input === 'object' ? (input as { type?: unknown }).type : undefined
    // L3 commands are checked against the permission table with the person's roles from the people list.
    const reason: AuditEntry['reason'] | null = !identity
      ? 'unknown-actor'
      : typeof type === 'string' && L3_COMMANDS.has(type)
        ? (this.allows(identity, type as L3Action) ? null : 'not-permitted')
        : identity.roles.includes(requiredRole(input, this.state))
          ? null
          : 'missing-role'
    if (reason) {
      const commandId = input && typeof input === 'object' && typeof (input as { id?: unknown }).id === 'string'
        ? (input as { id: string }).id
        : null
      return { ...this.refuse(actor, reason, commandId), state: this.state }
    }
    const result = reduceWorld(this.state, input)
    if (result.ok && !result.replayed) {
      this.log.push(result.state.history[result.state.history.length - 1])
      this.state = result.state
    }
    return result
  }

  /**
   * The only way to refuse on permission: every refusal (command, permissions read, record read) is built here, so each
   * one writes exactly one audit entry. A method that returns permission-denied without calling this is a defect.
   */
  private refuse<R extends AuditEntry['reason']>(actor: unknown, reason: R, commandId: string | null, target?: string):
    { ok: false; code: 'permission-denied'; reason: R } {
    this.auditLog.push(Object.freeze({ seq: this.auditLog.length + 1, actor: typeof actor === 'string' ? actor : null,
      commandId, reason, ...(target === undefined ? {} : { target }) }))
    return { ok: false, code: 'permission-denied', reason }
  }

  private identityOf(actor: unknown): Identity | undefined {
    return typeof actor === 'string' ? this.identities.get(actor) : undefined
  }

  /** The L3 roles of the person an identity acts as: from the business's people list, none when they are not in it. */
  private rolesOf(identity: Identity): readonly Role[] {
    return this.state.business?.people.find(p => p.id === identity.personId)?.roles ?? []
  }

  private allows(identity: Identity, action: L3Action): boolean {
    const roles = this.rolesOf(identity)
    return PERMISSIONS[action].some(role => roles.includes(role))
  }

  /** L3: the actions the acting identity may take now. Reading any record covers reading one's own, so only one is listed. */
  permissionsFor(actor: unknown): PermissionsResult {
    const identity = this.identityOf(actor)
    if (!identity) return this.refuse(actor, 'unknown-actor', null)
    const actions = (Object.keys(PERMISSIONS) as L3Action[]).filter(action => this.allows(identity, action))
    return {
      ok: true, actor: identity.id, personId: identity.personId ?? null, roles: this.rolesOf(identity),
      actions: actions.includes('read-record-any') ? actions.filter(a => a !== 'read-record-own') : actions,
    }
  }

  /**
   * L3: a restricted read of one person's employment record. Allowed for a role that may read any record, or for one's own
   * record with read-record-own. A refusal returns no part of the record and writes an audit entry naming the actor and the
   * person asked for. Whether a person exists is only told to a role that may read any record.
   */
  readRecord(actor: unknown, personId: string): RecordResult {
    const identity = this.identityOf(actor)
    const allowed = !!identity && (this.allows(identity, 'read-record-any') ||
      (identity.personId === personId && this.allows(identity, 'read-record-own')))
    if (!allowed) return this.refuse(actor, identity ? 'not-permitted' : 'unknown-actor', null, personId)
    const record = employmentRecord(this.state.business?.people ?? [], personId)
    return record ? { ok: true, record } : { ok: false, code: 'not-found' }
  }

  private recordAttempt(kind: AttemptEntry['kind'], actor: string | null, input: unknown, control: AttemptEntry['control'],
    result: ServiceResult, status: number = statusFor(result)): void {
    const entry: AttemptEntry = {
      seq: this.attemptLog.length + 1,
      kind,
      actor,
      input: input === undefined ? null : deepFreeze(structuredClone(input)),
      control,
      outcome: !result.ok ? 'rejected' : result.replayed ? 'replayed' : 'accepted',
      code: result.ok ? null : result.code,
      reason: !result.ok && 'reason' in result ? result.reason : null,
      status,
      state: deepFreeze(structuredClone(result.state)),
    }
    this.attemptLog.push(Object.freeze(entry))
  }

  /**
   * Rebuild from the log alone. Must equal `current` (determinism check). Uses the unbounded replay: the service's own
   * log holds only commands it accepted, so any log it can build must also replay (review of 50facaa3, P1).
   */
  rebuild(): WorldResult {
    return replayLog(this.log)
  }

  // ---- privileged controls: isolated test service only ----

  /** Return to the initial world with an empty log. Writes no state other than the initial world. */
  testReset(): WorldState {
    this.requireTest()
    this.state = createWorld()
    this.log.length = 0
    this.recordAttempt('control', null, null, 'reset', { ok: true, state: this.state, replayed: false })
    return this.state
  }

  /** Load a fixture by replaying ordinary commands, as the local test identity, from a fresh world. All-or-nothing. */
  testLoadFixture(commands: readonly unknown[]): ServiceResult {
    this.requireTest()
    const result = this.loadFixture(commands)
    this.recordAttempt('control', null, commands, 'fixture', result)
    return result
  }

  /**
   * Replays the fixture's ordinary commands through this service's own decide(), from a fresh world, all-or-nothing.
   * It runs in this service, never in a second one, so a refusal's audit entry lands in the one audit log (review of
   * 42eae88e, P1: a trial service wrote the entry and it was discarded). On failure the state and log are put back.
   */
  private loadFixture(commands: readonly unknown[]): ServiceResult {
    if (!Array.isArray(commands)) return { ok: false, code: 'invalid-command', state: this.state }
    const savedState = this.state
    const savedLog = this.log.slice()
    this.state = createWorld()
    this.log.length = 0
    for (const command of commands) {
      const result = this.decide(command, LOCAL_TEST_IDENTITY.id)
      if (!result.ok) {
        this.state = savedState
        this.log.length = 0
        this.log.push(...savedLog)
        return { ...result, state: this.state }
      }
    }
    return { ok: true, state: this.state, replayed: false }
  }

  testGoto(stage: unknown): ServiceResult {
    this.requireTest()
    const result: ServiceResult = typeof stage !== 'string' || !Object.prototype.hasOwnProperty.call(GOTO_PATH, stage)
      ? { ok: false, code: 'invalid-command', state: this.state }
      : this.loadFixture(GOTO_PATH[stage as Stage])
    this.recordAttempt('control', null, stage, 'goto', result)
    return result
  }

  private requireTest(): void {
    if (this.mode !== 'test') throw new PrivilegedControlRefused()
  }
}
