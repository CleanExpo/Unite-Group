/**
 * UNI-2774 slice 0: an original, deterministic, in-memory simulation.
 * This is NOT a persistence or professional-evidence service. A future trusted
 * server must rebuild from its own authenticated events, never accept a browser
 * snapshot/score as authority. No CARSI XP, credentials or entitlements are issued.
 */
export type Choice = 'seek-support' | 'rush-response'
export type Stage = 'briefing' | 'consequence' | 'reflected' | 'complete'
export type WorldCommand = Readonly<
  { id: string; expectedRevision: number } & (
    | { type: 'decide'; choice: Choice }
    | { type: 'reflect' }
    | { type: 'complete' }
  )
>

export interface WorldState {
  readonly schemaVersion: 1
  readonly scenarioVersion: 'capacity-pressure-v1'
  readonly source: 'simulation'
  readonly role: 'technician'
  readonly stage: Stage
  readonly revision: number
  readonly warehouse: Readonly<{ name: string; availableCapacity: number }>
  readonly consequence: Readonly<{
    kind: 'support-requested' | 'work-stopped'
    summary: string
  }> | null
  readonly progression: Readonly<{ reflections: 0 | 1; completedScenarios: 0 | 1 }>
  readonly professionalEvidence: 'not-assessed'
  readonly history: readonly WorldCommand[]
}

export type WorldResult =
  | { ok: true; state: WorldState; replayed: boolean }
  | { ok: false; code: 'invalid-command' | 'id-conflict' | 'stale-revision' | 'invalid-stage'; state: WorldState }

function freezeWorld(state: WorldState): WorldState {
  Object.freeze(state.warehouse)
  Object.freeze(state.progression)
  if (state.consequence) Object.freeze(state.consequence)
  state.history.forEach(Object.freeze)
  Object.freeze(state.history)
  return Object.freeze(state)
}

export function createWorld(): WorldState {
  return freezeWorld({
    schemaVersion: 1,
    scenarioVersion: 'capacity-pressure-v1',
    source: 'simulation',
    role: 'technician',
    stage: 'briefing',
    revision: 0,
    warehouse: { name: 'Fictional training warehouse', availableCapacity: 100 },
    consequence: null,
    progression: { reflections: 0, completedScenarios: 0 },
    professionalEvidence: 'not-assessed',
    history: [],
  })
}

function parseCommand(value: unknown): WorldCommand | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const command = value as Record<string, unknown>
  if (typeof command.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(command.id)) return null
  if (!Number.isSafeInteger(command.expectedRevision) || (command.expectedRevision as number) < 0) return null
  const keys = Object.keys(command).sort().join(',')
  const common = { id: command.id, expectedRevision: command.expectedRevision as number }
  if (command.type === 'decide' && keys === 'choice,expectedRevision,id,type' &&
      (command.choice === 'seek-support' || command.choice === 'rush-response')) {
    return { ...common, type: 'decide', choice: command.choice }
  }
  if (keys === 'expectedRevision,id,type' && (command.type === 'reflect' || command.type === 'complete')) {
    return { ...common, type: command.type }
  }
  return null
}

function sameCommand(a: WorldCommand, b: WorldCommand): boolean {
  return a.id === b.id && a.expectedRevision === b.expectedRevision && a.type === b.type &&
    (a.type !== 'decide' || (b.type === 'decide' && a.choice === b.choice))
}

/** State is produced in-process by this module, not deserialised from a client. */
export function reduceWorld(state: WorldState, input: unknown): WorldResult {
  const command = parseCommand(input)
  if (!command) return { ok: false, code: 'invalid-command', state }
  const previous = state.history.find(event => event.id === command.id)
  if (previous) {
    return sameCommand(previous, command)
      ? { ok: true, state, replayed: true }
      : { ok: false, code: 'id-conflict', state }
  }
  if (command.expectedRevision !== state.revision) return { ok: false, code: 'stale-revision', state }

  let next: WorldState
  if (command.type === 'decide' && state.stage === 'briefing') {
    const supported = command.choice === 'seek-support'
    next = {
      ...state,
      stage: 'consequence',
      warehouse: { ...state.warehouse, availableCapacity: supported ? 60 : 20 },
      consequence: supported
        ? { kind: 'support-requested', summary: 'The fictional response waits for qualified support. Capacity is reserved and the customer receives an honest delay.' }
        : { kind: 'work-stopped', summary: 'The fictional response is stopped because site risks and support were not confirmed. Rework consumes capacity; rushing did not complete the job.' },
    }
  } else if (command.type === 'reflect' && state.stage === 'consequence') {
    next = { ...state, stage: 'reflected', progression: { ...state.progression, reflections: 1 } }
  } else if (command.type === 'complete' && state.stage === 'reflected') {
    next = { ...state, stage: 'complete', progression: { ...state.progression, completedScenarios: 1 } }
  } else {
    return { ok: false, code: 'invalid-stage', state }
  }
  return {
    ok: true,
    replayed: false,
    state: freezeWorld({
      ...next,
      source: 'simulation',
      professionalEvidence: 'not-assessed',
      revision: state.revision + 1,
      history: [...state.history, command],
    }),
  }
}

/** Bounded local replay, useful to test renderer-independent behaviour. */
export function replayWorld(commands: readonly unknown[]): WorldResult {
  let state = createWorld()
  if (commands.length > 256) return { ok: false, code: 'invalid-command', state }
  for (const command of commands) {
    const result = reduceWorld(state, command)
    if (!result.ok) return result
    state = result.state
  }
  return { ok: true, state, replayed: false }
}
