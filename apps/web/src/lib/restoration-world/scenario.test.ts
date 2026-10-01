import { describe, expect, it } from 'vitest'
import { createWorld, reduceWorld, replayWorld, type WorldState } from './scenario'

const decide = { id: 'decision-1', expectedRevision: 0, type: 'decide', choice: 'seek-support' } as const
const reflect = { id: 'reflection-1', expectedRevision: 1, type: 'reflect' } as const
const complete = { id: 'complete-1', expectedRevision: 2, type: 'complete' } as const

function accepted(state: WorldState, command: unknown): WorldState {
  const result = reduceWorld(state, command)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.code)
  return result.state
}

describe('Restoration World — deterministic fictional playtest', () => {
  it('starts with explicit simulation provenance and no professional evidence', () => {
    const state = createWorld()
    expect(state.source).toBe('simulation')
    expect(state.professionalEvidence).toBe('not-assessed')
    expect(state.progression).toEqual({ reflections: 0, completedScenarios: 0 })
    expect(state.revision).toBe(0)
    expect(state.history).toEqual([])
    expect(state.stage).toBe('briefing')
  })

  it('changes the warehouse and consequence from one decision without mutating inputs', () => {
    const original = createWorld()
    const before = JSON.stringify(original)
    const state = accepted(original, decide)
    expect(state.warehouse.availableCapacity).toBe(60)
    expect(state.consequence?.kind).toBe('support-requested')
    expect(state.stage).toBe('consequence')
    expect(state.revision).toBe(1)
    expect(JSON.stringify(original)).toBe(before)
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(state.warehouse)).toBe(true)
    expect(Object.isFrozen(state.history[0])).toBe(true)
    expect(Object.isFrozen(state.history)).toBe(true)
  })

  it('stops the rushed fictional response rather than rewarding unsafe work', () => {
    const state = accepted(createWorld(), { ...decide, choice: 'rush-response' })
    expect(state.consequence?.kind).toBe('work-stopped')
    expect(state.warehouse.availableCapacity).toBe(20)
    expect(state.progression).toEqual({ reflections: 0, completedScenarios: 0 })
    expect(state.professionalEvidence).toBe('not-assessed')
  })

  it('completes reflection and a scenario only in simulation', () => {
    let state = accepted(createWorld(), decide)
    state = accepted(state, reflect)
    expect(state.stage).toBe('reflected')
    expect(state.progression).toEqual({ reflections: 1, completedScenarios: 0 })
    state = accepted(state, complete)
    expect(state.stage).toBe('complete')
    expect(state.progression).toEqual({ reflections: 1, completedScenarios: 1 })
    expect(state.professionalEvidence).toBe('not-assessed')
    expect(state.history).toHaveLength(3)
  })

  it('replays identical commands byte-for-byte', () => {
    const first = replayWorld([decide, reflect, complete])
    const second = replayWorld([decide, reflect, complete])
    expect(first.ok).toBe(true)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('treats retries as no-ops even after later commands and keeps history bounded', () => {
    let state = accepted(accepted(accepted(createWorld(), decide), reflect), complete)
    const original = state
    for (let i = 0; i < 100; i += 1) {
      const result = reduceWorld(state, reflect)
      expect(result.ok && result.replayed).toBe(true)
      if (result.ok) state = result.state
    }
    expect(state).toBe(original)
    expect(state.history).toHaveLength(3)
    expect(state.progression.reflections).toBe(1)
  })

  it('rejects reuse of a command ID for a changed payload', () => {
    const state = accepted(createWorld(), decide)
    const result = reduceWorld(state, { ...decide, choice: 'rush-response' })
    expect(result).toEqual({ ok: false, code: 'id-conflict', state })
  })

  it('rejects a stale revision without changing state', () => {
    const state = accepted(createWorld(), decide)
    expect(reduceWorld(state, { ...reflect, expectedRevision: 0 })).toEqual({
      ok: false, code: 'stale-revision', state,
    })
  })

  it.each([
    { id: 'x', expectedRevision: 0, type: 'reflect' },
    { id: 'x', expectedRevision: 0, type: 'complete' },
  ])('rejects out-of-order initial command %j', command => {
    const state = createWorld()
    expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-stage', state })
  })

  it('rejects every new command after completion', () => {
    const state = accepted(accepted(accepted(createWorld(), decide), reflect), complete)
    for (const command of [
      { ...decide, id: 'extra-decision', expectedRevision: 3 },
      { ...reflect, id: 'extra-reflection', expectedRevision: 3 },
      { ...complete, id: 'extra-complete', expectedRevision: 3 },
    ]) expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-stage', state })
  })

  it.each([
    null, undefined, [], {}, 'decide',
    { ...decide, id: '' }, { ...decide, id: 'x'.repeat(65) },
    { ...decide, id: 'bad id' }, { ...decide, expectedRevision: -1 },
    { ...decide, expectedRevision: NaN }, { ...decide, expectedRevision: 0.5 },
    { ...decide, expectedRevision: '0' }, { ...decide, choice: 'invented' },
    { ...decide, type: 'award-credential' }, { ...decide, professionalCredits: 10 },
    { ...reflect, choice: 'seek-support' },
  ])('fails closed for malformed/extended command %j', command => {
    const state = createWorld()
    expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-command', state })
  })

  it('does not retain a caller-owned command reference', () => {
    const command: Record<string, unknown> = { ...decide }
    const state = accepted(createWorld(), command)
    command.id = 'changed'
    expect(state.history[0].id).toBe('decision-1')
  })

  it('returns the last valid state when replay encounters an invalid event', () => {
    const result = replayWorld([decide, { ...complete, expectedRevision: 1 }])
    expect(result.ok).toBe(false)
    expect(result.state.revision).toBe(1)
    expect(result.state.progression.completedScenarios).toBe(0)
  })

  it('bounds replay input before doing work', () => {
    const result = replayWorld(Array.from({ length: 257 }, () => decide))
    expect(result).toEqual({ ok: false, code: 'invalid-command', state: createWorld() })
  })

  it('resets only by creating a new fictional world, with no rewards or retained progress', () => {
    const first = accepted(accepted(accepted(createWorld(), decide), reflect), complete)
    const reset = createWorld()
    expect(reset.history).toHaveLength(0)
    expect(reset.progression).toEqual({ reflections: 0, completedScenarios: 0 })
    expect(accepted(reset, decide).revision).toBe(1)
    expect(first.professionalEvidence).toBe('not-assessed')
    expect(reset.professionalEvidence).toBe('not-assessed')
  })
})
