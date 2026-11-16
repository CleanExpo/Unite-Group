import { describe, expect, it } from 'vitest'
import { CLAIM_FEE_AUD, checkDecisionCard, checkJobs, createWorld, JOB_BUILDER, JOBS, reduceWorld, replayWorld, type ClaimOption,
  type WorldState } from './scenario'

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

const brisbane = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
const business = (address: Record<string, unknown> = brisbane, extra: Record<string, unknown> = {}) =>
  ({ id: 'business-1', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers Pty Ltd', address, ...extra })

describe('L1 business profile and home base (UNI-2953): the service owns the address rule and the home base', () => {
  it('ACC-1a: an Australian address is saved with AUD, its state time zone, four separate zero stats and the five areas', () => {
    const state = accepted(createWorld(), business())
    expect(state.business).toEqual({
      name: 'Fictional Restorers Pty Ltd', address: brisbane, currency: 'AUD', timeZone: 'Australia/Brisbane',
      stats: { reputation: 0, businessCredits: 0 },
      // L3: the owner is the only person at the start, and no vacancy is posted.
      people: [{ id: 'player', name: 'You', roles: ['owner'], progression: null }],
      vacancy: null,
    })
    expect(state.homeBase?.areas.map(a => a.id)).toEqual(['office', 'dispatch', 'equipment-bay', 'vehicle-area', 'drying-storage'])
    expect(state.homeBase?.areas.map(a => a.label)).toEqual(['Office', 'Dispatch', 'Equipment bay', 'Vehicle area', 'Drying storage'])
    expect(state.revision).toBe(1)
    expect(state.stage).toBe('briefing')
    expect(state.professionalEvidence).toBe('not-assessed')
    expect(Object.isFrozen(state.business)).toBe(true)
    expect(Object.isFrozen(state.business?.address)).toBe(true)
    expect(Object.isFrozen(state.business?.stats)).toBe(true)
    expect(Object.isFrozen(state.homeBase)).toBe(true)
  })

  it.each([
    ['NSW', 'Australia/Sydney'], ['ACT', 'Australia/Sydney'], ['VIC', 'Australia/Melbourne'], ['TAS', 'Australia/Hobart'],
    ['SA', 'Australia/Adelaide'], ['NT', 'Australia/Darwin'], ['WA', 'Australia/Perth'],
  ])('an address in %s is on %s', (region, timeZone) => {
    expect(accepted(createWorld(), business({ ...brisbane, region })).business?.timeZone).toBe(timeZone)
  })

  it('a New Zealand address is saved with NZD and Pacific/Auckland', () => {
    const auckland = { line1: '5 Fictional Ave', suburb: 'Ponsonby', region: 'Auckland', postcode: '1011', country: 'NZ' }
    const state = accepted(createWorld(), business(auckland))
    expect(state.business).toMatchObject({ address: auckland, currency: 'NZD', timeZone: 'Pacific/Auckland' })
  })

  it.each([
    [{ ...brisbane, country: 'US', region: 'OR', postcode: '97477' }, 'country-outside-au-nz'],
    [{ ...brisbane, country: 'GB', region: 'QLD' }, 'country-outside-au-nz'],
    [{ ...brisbane, country: 'au' }, 'country-outside-au-nz'],
    [{ ...brisbane, region: 'Queensland' }, 'region-unknown'],
    [{ ...brisbane, country: 'NZ', region: 'QLD' }, 'region-unknown'],
    [{ ...brisbane, region: 'toString' }, 'region-unknown'],
    [{ ...brisbane, region: 'constructor' }, 'region-unknown'],
    [{ ...brisbane, region: '__proto__' }, 'region-unknown'],
    [{ ...brisbane, region: 'hasOwnProperty' }, 'region-unknown'],
    [{ ...brisbane, country: 'NZ', region: 'toString' }, 'region-unknown'],
    [{ ...brisbane, postcode: '400' }, 'postcode-invalid'],
    [{ ...brisbane, postcode: '4006A' }, 'postcode-invalid'],
  ])('NEG-1: address %j is refused with reason %s and changes nothing', (address, reason) => {
    const state = createWorld()
    expect(reduceWorld(state, business(address))).toEqual({ ok: false, code: 'invalid-address', reason, state })
  })

  it.each([
    business({ ...brisbane, line1: '' }),
    business({ ...brisbane, suburb: '  ' }),
    business({ line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006' }),
    business({ ...brisbane, note: 'extra' }),
    business(brisbane, { name: '' }),
    business(brisbane, { name: 'x'.repeat(81) }),
    business(brisbane, { currency: 'AUD' }),
    business(brisbane, { stats: { reputation: 99 } }),
    { id: 'business-1', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers' },
  ])('ACC-1a fail case: a profile with a missing, blank or extra field is refused as a malformed command %j', command => {
    const state = createWorld()
    expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-command', state })
  })

  it('a client-supplied currency, time zone, stat or area never reaches state', () => {
    const state = accepted(createWorld(), business())
    expect(state.business?.currency).toBe('AUD')
    expect(state.business?.stats).toEqual({ reputation: 0, businessCredits: 0 })
    for (const command of [business(brisbane, { id: 'b2', expectedRevision: 1, currency: 'USD' }), business(brisbane, { id: 'b3', expectedRevision: 1, homeBase: { areas: [] } })]) {
      expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-command', state })
    }
  })

  it('an accepted create-business event is frozen through its address, so history cannot be rewritten in process', () => {
    const state = accepted(createWorld(), business())
    const event = state.history[0] as { address: { region: string } }
    expect(Object.isFrozen(event)).toBe(true)
    expect(Object.isFrozen(event.address)).toBe(true)
    expect(() => { event.address.region = 'NSW' }).toThrow(TypeError)
    expect(state.business?.address.region).toBe('QLD')
  })

  it('one business only: a second profile is refused, and the same command replays as a no-op', () => {
    const state = accepted(createWorld(), business())
    expect(reduceWorld(state, business(brisbane, { id: 'business-2', expectedRevision: 1 }))).toEqual({ ok: false, code: 'invalid-stage', state })
    expect(reduceWorld(state, business())).toEqual({ ok: true, state, replayed: true })
    expect(reduceWorld(state, business(brisbane, { name: 'Other Name' }))).toEqual({ ok: false, code: 'id-conflict', state })
  })

  it('the business profile and the technician scenario coexist: either order, rebuilt identically by replay', () => {
    const profileFirst = accepted(accepted(createWorld(), business()), { ...decide, expectedRevision: 1 })
    const decideFirst = accepted(accepted(createWorld(), decide), business(brisbane, { expectedRevision: 1 }))
    expect(profileFirst.business).toEqual(decideFirst.business)
    expect(profileFirst.consequence).toEqual(decideFirst.consequence)
    const replayed = replayWorld([business(), { ...decide, expectedRevision: 1 }])
    expect(replayed.ok).toBe(true)
    expect(JSON.stringify(replayed.ok && replayed.state)).toBe(JSON.stringify(profileFirst))
  })
})

const enter = { id: 'enter-1', expectedRevision: 1, type: 'enter-claim' } as const
const decideClaim = (optionId: string, extra: Record<string, unknown> = {}) =>
  ({ id: 'decide-claim-1', expectedRevision: 2, type: 'decide-claim', optionId, ...extra })
const completeClaim = { id: 'complete-claim-1', expectedRevision: 3, type: 'complete-claim' } as const
const onSite = () => accepted(accepted(createWorld(), business()), enter)

describe('L2 technician claim: the service owns the zones, the decision card, every effect and the stat change', () => {
  it('ACC-2a/2b: entering the claim creates the water-loss instance with three wet zones and nothing dried', () => {
    const state = onSite()
    expect(state.revision).toBe(2)
    expect(state.claim).toMatchObject({ id: 'l2-water-loss', lossType: 'water', tier: 'beginner', stage: 'on-site', feeAud: CLAIM_FEE_AUD,
      chosenOptionId: null, consequence: null, evidenceLevel: 'simulated' })
    expect(state.claim?.zones.map(z => [z.id, z.surface, z.wetAreaPercent, z.dryingProgressPercent])).toEqual([
      ['laundry-floor', 'tile', 100, 0], ['lounge-carpet', 'carpet', 45, 0], ['lounge-wall', 'plasterboard', 30, 0]])
    expect(state.business?.stats).toEqual({ reputation: 0, businessCredits: 0 })
    expect(state.professionalEvidence).toBe('not-assessed')
  })

  it('ACC-2c/RUL-2b: the card has exactly four options with four effects each; only the unsafe shortcut is a boundary, and it shows its consequence', () => {
    const options = onSite().claim?.options ?? []
    expect(options).toHaveLength(4)
    for (const option of options) {
      expect(Object.keys(option.effects).sort()).toEqual(['clientSatisfaction', 'costAud', 'dryingTimeHours', 'reputation'])
      expect(option.simulationBoundary).toBe(option.shownConsequence !== null)
    }
    const boundary = options.filter(o => o.simulationBoundary)
    expect(boundary.map(o => o.id)).toEqual(['power-on-shortcut'])
    expect(boundary[0].shownConsequence).toMatch(/electrician/)
  })

  it('NEG-2b: the authoring check passes the served card and refuses an unsafe option without its consequence or its mark', () => {
    const card: readonly ClaimOption[] = onSite().claim?.options ?? []
    expect(checkDecisionCard(card)).toEqual([])
    const withUnsafe = (change: Partial<ClaimOption>) => card.map(o => (o.simulationBoundary ? { ...o, ...change } : o))
    expect(checkDecisionCard(withUnsafe({ shownConsequence: null }))).toEqual(['power-on-shortcut: unsafe shortcut without the consequence it shows'])
    expect(checkDecisionCard(withUnsafe({ shownConsequence: '  ' }))).toEqual(['power-on-shortcut: unsafe shortcut without the consequence it shows'])
    expect(checkDecisionCard(withUnsafe({ simulationBoundary: false }))).toEqual([
      'power-on-shortcut: shows a consequence without the simulation-boundary mark', 'power-on-shortcut: the unsafe shortcut is missing or not marked'])
    expect(checkDecisionCard(withUnsafe({ simulationBoundary: false, shownConsequence: null }))).toEqual([
      'power-on-shortcut: the unsafe shortcut is missing or not marked'])
    // The mark moved to a safe option, warning and all: the unsafe option is bare (gate review of 99984f47).
    const unsafe = card.find(o => o.simulationBoundary)
    const swapped = card.map(o => o.id === 'dry-in-place'
      ? { ...o, simulationBoundary: true, shownConsequence: unsafe?.shownConsequence ?? null }
      : o.simulationBoundary ? { ...o, simulationBoundary: false, shownConsequence: null } : o)
    expect(checkDecisionCard(swapped)).toEqual([
      'dry-in-place: marked as the unsafe shortcut, which is power-on-shortcut', 'power-on-shortcut: the unsafe shortcut is missing or not marked'])
    // A second mark beside the right one is refused too.
    expect(checkDecisionCard(card.map(o => o.id === 'lift-and-dry' ? { ...o, simulationBoundary: true, shownConsequence: 'Unsafe.' } : o)))
      .toEqual(['lift-and-dry: marked as the unsafe shortcut, which is power-on-shortcut'])
    expect(checkDecisionCard(card.slice(1))).toEqual(['the card has 3 options, it needs 4'])
    // Renaming the unsafe option also moves its mark off power-on-shortcut, so the binding check names that too.
    expect(checkDecisionCard([...card.slice(0, 3), { ...card[3], id: card[0].id }])).toEqual(['two options share an id',
      'dry-in-place: marked as the unsafe shortcut, which is power-on-shortcut', 'power-on-shortcut: the unsafe shortcut is missing or not marked'])
  })

  it('a claim needs a business, and there is one claim only', () => {
    const noBusiness = createWorld()
    expect(reduceWorld(noBusiness, { ...enter, expectedRevision: 0 })).toEqual({ ok: false, code: 'invalid-stage', state: noBusiness })
    const state = onSite()
    expect(reduceWorld(state, { ...enter, id: 'enter-2', expectedRevision: 2 })).toEqual({ ok: false, code: 'invalid-stage', state })
  })

  it.each([
    ['dry-in-place', [100, 100, 100], 6, 3500 - 1850],
    ['lift-and-dry', [100, 100, 100], 4, 3500 - 2600],
    ['replace-flooring', [100, 100, 40], -4, 3500 - 4300],
    ['power-on-shortcut', [0, 0, 0], -15, 3500 - 2950],
  ])('ACC-2d/2e: option %s sets the zones to %j, and completing moves reputation by %i and credits by %i', (optionId, progress, reputation, credits) => {
    const decided = accepted(onSite(), decideClaim(optionId))
    expect(decided.claim?.stage).toBe('decided')
    expect(decided.claim?.chosenOptionId).toBe(optionId)
    expect(decided.claim?.consequence).toEqual(expect.any(String))
    expect(decided.claim?.zones.map(z => z.dryingProgressPercent)).toEqual(progress)
    expect(decided.business?.stats.reputation).toBe(0)
    const done = accepted(decided, completeClaim)
    expect(done.claim?.stage).toBe('complete')
    expect(done.business?.stats).toEqual({ reputation, businessCredits: credits })
    expect(done.person.stats).toEqual({ capability: 0, industryContribution: 0, reputation })
  })

  it.each([
    decideClaim('dry-in-place', { effects: { dryingTimeHours: 1, costAud: 0, clientSatisfaction: 99, reputation: 99 } }),
    decideClaim('dry-in-place', { reputation: 99 }),
    decideClaim('other'),
    { id: 'decide-claim-1', expectedRevision: 2, type: 'decide-claim' },
    { ...enter, expectedRevision: 2, extra: true },
    { ...completeClaim, expectedRevision: 2, effects: {} },
  ])('NEG-2a: a claim command with forged effects, an extra key or an unknown option is invalid and changes nothing %j', command => {
    const state = onSite()
    expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-command', state })
  })

  it('stages run in order only: no decision before entering, no completion before deciding, nothing after completion', () => {
    const business1 = accepted(createWorld(), business())
    expect(reduceWorld(business1, { ...decideClaim('dry-in-place'), expectedRevision: 1 })).toMatchObject({ ok: false, code: 'invalid-stage' })
    const state = onSite()
    expect(reduceWorld(state, { ...completeClaim, expectedRevision: 2 })).toEqual({ ok: false, code: 'invalid-stage', state })
    const decided = accepted(state, decideClaim('dry-in-place'))
    expect(reduceWorld(decided, { ...decideClaim('lift-and-dry'), id: 'decide-claim-2', expectedRevision: 3 })).toEqual({ ok: false, code: 'invalid-stage', state: decided })
    const done = accepted(decided, completeClaim)
    for (const command of [{ ...completeClaim, id: 'c2', expectedRevision: 4 }, { ...decideClaim('lift-and-dry'), id: 'd3', expectedRevision: 4 }, { ...enter, id: 'e3', expectedRevision: 4 }]) {
      expect(reduceWorld(done, command)).toEqual({ ok: false, code: 'invalid-stage', state: done })
    }
  })

  it('the claim is frozen all the way down, so a zone, an option or an effect cannot be changed in process', () => {
    const state = accepted(onSite(), decideClaim('dry-in-place'))
    const claim = state.claim!
    expect(Object.isFrozen(claim)).toBe(true)
    expect(Object.isFrozen(claim.zones[0])).toBe(true)
    expect(Object.isFrozen(claim.options[0].effects)).toBe(true)
    expect(() => { (claim.options[0].effects as { reputation: number }).reputation = 99 }).toThrow(TypeError)
    expect(() => { (claim.zones[0] as { dryingProgressPercent: number }).dryingProgressPercent = 5 }).toThrow(TypeError)
    // A fresh claim is not affected by anything done to an earlier one.
    expect(onSite().claim?.options[0].effects.reputation).toBe(6)
  })

  it('the whole claim replays byte for byte, and a retried command is a no-op', () => {
    const commands = [business(), enter, decideClaim('lift-and-dry'), completeClaim]
    const live = commands.reduce((s, c) => accepted(s, c), createWorld())
    const replayed = replayWorld(commands)
    expect(replayed.ok).toBe(true)
    expect(JSON.stringify(replayed.ok && replayed.state)).toBe(JSON.stringify(live))
    expect(reduceWorld(live, decideClaim('lift-and-dry'))).toEqual({ ok: true, state: live, replayed: true })
    expect(reduceWorld(live, decideClaim('dry-in-place'))).toEqual({ ok: false, code: 'id-conflict', state: live })
  })
})

const person0 = { stats: { capability: 0, industryContribution: 0, reputation: 0 }, credentials: [], hours: 0, businesses: [] }

describe('SP-50a-2a-1 person record (P2, DR-004): the person owns its stats and tenures, the business owns its own', () => {
  it('A1: the person starts empty, gains one tenure with create-business, and complete-claim moves both reputations once', () => {
    expect(createWorld().person).toEqual(person0)
    const created = accepted(createWorld(), business())
    expect(created.revision).toBe(1)
    expect(created.person).toEqual({ ...person0, businesses: [{ name: 'Fictional Restorers Pty Ltd', startRevision: 1, endRevision: null }] })
    expect(created.business?.stats).toEqual({ reputation: 0, businessCredits: 0 })
    const done = [enter, decideClaim('dry-in-place'), completeClaim].reduce((s, c) => accepted(s, c), created)
    expect(done.revision).toBe(4)
    expect(done.person.stats).toEqual({ capability: 0, industryContribution: 0, reputation: 6 })
    expect(done.person.hours).toBe(0)
    expect(done.business?.stats).toEqual({ reputation: 6, businessCredits: 1650 })
    const resent = reduceWorld(done, completeClaim)
    expect(resent).toEqual({ ok: true, state: done, replayed: true })
    expect(resent.state.person.stats.reputation).toBe(6)
    // Expected values from the option table: fee 3500 minus the option's cost.
    for (const [optionId, reputation, credits] of [['lift-and-dry', 4, 900], ['power-on-shortcut', -15, 550]] as const) {
      const world = [business(), enter, decideClaim(optionId), completeClaim].reduce((s, c) => accepted(s, c), createWorld())
      expect(world.person.stats).toEqual({ capability: 0, industryContribution: 0, reputation })
      expect(world.business?.stats).toEqual({ reputation, businessCredits: credits })
    }
  })

  it('I6: the person record, its stats, credentials, tenure list and each tenure are frozen', () => {
    const state = accepted(createWorld(), business())
    expect(Object.isFrozen(state.person)).toBe(true)
    expect(Object.isFrozen(state.person.stats)).toBe(true)
    expect(Object.isFrozen(state.person.credentials)).toBe(true)
    expect(Object.isFrozen(state.person.businesses)).toBe(true)
    expect(Object.isFrozen(state.person.businesses[0])).toBe(true)
  })

  it('I7: the person and business reputations move independently', () => {
    const decided = accepted(onSite(), decideClaim('dry-in-place'))
    // Test only: the person arrives with a reputation of 10 earned elsewhere; the business still holds 0.
    const draft = structuredClone(decided) as unknown as { person: { stats: { reputation: number } } }
    draft.person.stats.reputation = 10
    const done = accepted(draft as unknown as WorldState, completeClaim)
    expect(done.person.stats.reputation).toBe(16)
    expect(done.business?.stats).toEqual({ reputation: 6, businessCredits: 1650 })
  })

  it('A4: the v1 L2 and L1 command sequences still give the v1 values', () => {
    // Literals from the game repo's run files at 0db944c: client/harness/runs/l2-claim.json:6-12 (commands) and :44, :45,
    // :47 (values); client/harness/runs/l1-home-base.json:6-13. No game-repo file is read here (the suite runs in CI alone).
    const address = { line1: '12 Fictional Road', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const create = { id: 'l2-create', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers Pty Ltd', address }
    const forged = { id: 'l2-forged', expectedRevision: 2, type: 'decide-claim', optionId: 'dry-in-place',
      effects: { dryingTimeHours: 1, costAud: 0, clientSatisfaction: 99, reputation: 99 } }
    let state = accepted(accepted(createWorld(), create), { id: 'l2-enter', expectedRevision: 1, type: 'enter-claim' })
    expect(reduceWorld(state, forged)).toEqual({ ok: false, code: 'invalid-command', state })
    state = accepted(state, { id: 'l2-decide', expectedRevision: 2, type: 'decide-claim', optionId: 'dry-in-place' })
    state = accepted(state, { id: 'l2-complete', expectedRevision: 3, type: 'complete-claim' })
    expect(state.business?.stats.reputation).toBe(6)
    expect(state.business?.stats.businessCredits).toBe(1650)
    expect(state.revision).toBe(4)

    const l1 = accepted(createWorld(), { ...create, id: 'l1-create' })
    expect(l1.revision).toBe(1)
    expect(l1.business?.stats).toEqual({ reputation: 0, businessCredits: 0 })
    expect(l1.person.stats).toEqual({ capability: 0, industryContribution: 0, reputation: 0 })
    const abroad = { id: 'l1-abroad', expectedRevision: 1, type: 'create-business', name: 'Offshore Restorers',
      address: { line1: '1 Example Street', suburb: 'Springfield', region: 'OR', postcode: '97477', country: 'US' } }
    const missing = { id: 'l1-missing', expectedRevision: 1, type: 'create-business', name: 'Incomplete Restorers',
      address: { line1: '3 Fictional Lane', suburb: 'Newmarket', region: 'QLD', country: 'AU' } }
    const second = { id: 'l1-second', expectedRevision: 1, type: 'create-business', name: 'Second Restorers',
      address: { line1: '9 Fictional Street', suburb: 'Ponsonby', region: 'Auckland', postcode: '1011', country: 'NZ' } }
    expect(reduceWorld(l1, abroad)).toEqual({ ok: false, code: 'invalid-address', reason: 'country-outside-au-nz', state: l1 })
    expect(reduceWorld(l1, missing)).toEqual({ ok: false, code: 'invalid-command', state: l1 })
    expect(reduceWorld(l1, second)).toEqual({ ok: false, code: 'invalid-stage', state: l1 })
  })
})

const job = (waterSource: string, timeBeforeArrival: string, expectedRevision = 1, id = 'job-1') =>
  ({ id, expectedRevision, type: 'enter-claim', setup: { waterSource, timeBeforeArrival } })
const call = (category: unknown, expectedRevision = 2, id = 'call-1') => ({ id, expectedRevision, type: 'call-category', category })
const onJob = (waterSource: string, timeBeforeArrival: string) => accepted(accepted(createWorld(), business()), job(waterSource, timeBeforeArrival))

// Expected values written out by hand from the B1 job table, so a change to the table fails here.
const JOB_CASES = [
  // source, time, actual, accepted, right plan, its progress, reputation, credits (fee 3500 minus cost)
  ['supply-hose', 'same-day', 1, [1], 'dry-in-place', [100, 100, 100], 6, 3500 - 1850],
  ['supply-hose', 'four-warm-days', 2, [2, 3], 'lift-and-dry', [100, 100, 100], 6, 3500 - 2900],
  ['drain-hose', 'same-day', 2, [2], 'lift-and-dry', [100, 100, 100], 6, 3500 - 2900],
  ['drain-hose', 'four-warm-days', 3, [3], 'replace-flooring', [100, 100, 100], 6, 3500 - 4600],
] as const

describe('B1 job builder: four jobs, a Category call the service judges, then the job\'s own card', () => {
  it('B1 the home base offers the two builder choices, and the job table has exactly one job for each pair', () => {
    const state = accepted(createWorld(), business())
    expect(state.homeBase?.jobBuilder.waterSources.map(o => o.id)).toEqual(['supply-hose', 'drain-hose'])
    expect(state.homeBase?.jobBuilder.timesBeforeArrival.map(o => o.id)).toEqual(['same-day', 'four-warm-days'])
    expect(state.homeBase?.jobBuilder).toBe(JOB_BUILDER)
    // The game fits each label in one picker about 450 px wide (client UI audit): 40 characters at most.
    for (const o of [...JOB_BUILDER.waterSources, ...JOB_BUILDER.timesBeforeArrival]) expect(o.label.length).toBeLessThanOrEqual(40)
    expect(checkJobs(JOBS)).toEqual([])
  })

  it('B1 the load-time job check refuses a missing job, a duplicate, a moved unsafe mark, a missing zone and a wrong answer key', () => {
    expect(checkJobs(JOBS.slice(1))).toEqual(['supply-hose / same-day: 0 jobs, it needs 1', '3 jobs'])
    expect(checkJobs([...JOBS, JOBS[0]])).toEqual(['supply-hose / same-day: 2 jobs, it needs 1', '5 jobs'])
    const moved = JOBS.map((j, i) => i !== 2 ? j : { ...j, options: j.options.map(o => o.id === 'lift-and-dry'
      ? { ...o, simulationBoundary: true, shownConsequence: 'Unsafe.' } : o) })
    expect(checkJobs(moved)).toEqual(['drain-hose / same-day: lift-and-dry: marked as the unsafe shortcut, which is power-on-shortcut'])
    const noWall = JOBS.map((j, i) => i !== 3 ? j : { ...j, outcomes: { ...j.outcomes,
      'dry-in-place': { ...j.outcomes['dry-in-place'], progress: { 'laundry-floor': 100, 'lounge-carpet': 100 } as never } } })
    expect(checkJobs(noWall)).toEqual(['drain-hose / four-warm-days: dry-in-place has no progress for lounge-wall'])
    const wrongKey = JOBS.map((j, i) => i !== 1 ? j : { ...j, category: { ...j.category, actual: 1 as const } })
    expect(checkJobs(wrongKey)).toEqual(['supply-hose / four-warm-days: actual Category 1 is not accepted'])
  })

  it.each(JOB_CASES)('B1 %s / %s: the job opens on site with its notes and no call, and Category %i is judged right',
    (source, time, actual, acceptedCategories) => {
      const state = onJob(source, time)
      expect(state.claim).toMatchObject({ stage: 'on-site', setup: { waterSource: source, timeBeforeArrival: time }, categoryCall: null,
        chosenOptionId: null })
      expect(state.claim?.siteNotes.length).toBeGreaterThan(0)
      expect(state.claim?.title).toMatch(time === 'same-day' ? /found the same day/ : /found after four warm days/)
      for (const category of acceptedCategories) {
        const called = accepted(state, call(category))
        expect(called.claim?.categoryCall).toEqual({ called: category, actual, accepted: acceptedCategories, correct: true,
          why: expect.stringMatching(new RegExp(`^Right: you called Category ${category}\\. `)) })
        expect(called.claim?.stage).toBe('on-site')
      }
    })

  it.each([
    ['supply-hose', 'same-day', 2, /^Too high: you called Category 2\./],
    ['supply-hose', 'four-warm-days', 1, /^Too low: you called Category 1\./],
    ['drain-hose', 'same-day', 1, /^Too low: you called Category 1\./],
    ['drain-hose', 'same-day', 3, /^Too high: you called Category 3\./],
    ['drain-hose', 'four-warm-days', 2, /^Too low: you called Category 2\./],
  ] as const)('B1 %s / %s: calling Category %i is judged wrong and says which way', (source, time, category, why) => {
    const called = accepted(onJob(source, time), call(category))
    expect(called.claim?.categoryCall?.correct).toBe(false)
    expect(called.claim?.categoryCall?.why).toMatch(why)
  })

  it.each(JOB_CASES)('B1 %s / %s: after the call, the right plan dries every zone and completing pays the job\'s own values',
    (source, time, actual, _accepted, plan, progress, reputation, credits) => {
      const decided = accepted(accepted(onJob(source, time), call(actual)), { id: 'plan-1', expectedRevision: 3, type: 'decide-claim', optionId: plan })
      expect(decided.claim?.zones.map(z => z.dryingProgressPercent)).toEqual(progress)
      const done = accepted(decided, { id: 'done-1', expectedRevision: 4, type: 'complete-claim' })
      expect(done.business?.stats).toEqual({ reputation, businessCredits: credits })
      expect(done.person.stats.reputation).toBe(reputation)
    })

  it('B1 a Category 2 card names the cleaning, and a Category 3 job punishes keeping the carpet', () => {
    const lift = (s: WorldState) => s.claim?.options.find(o => o.id === 'lift-and-dry')?.label
    expect(lift(onJob('drain-hose', 'same-day'))).toMatch(/clean and dry the carpet/)
    expect(lift(onJob('supply-hose', 'same-day'))).not.toMatch(/clean/)
    const cat3 = accepted(onJob('drain-hose', 'four-warm-days'), call(3))
    const kept = accepted(accepted(cat3, { id: 'plan-1', expectedRevision: 3, type: 'decide-claim', optionId: 'dry-in-place' }),
      { id: 'done-1', expectedRevision: 4, type: 'complete-claim' })
    expect(kept.business?.stats).toEqual({ reputation: -14, businessCredits: 3500 - 1850 })
    expect(kept.claim?.consequence).toMatch(/contaminated/)
  })

  it('B1 a built job takes no plan before the call (category-not-called), and the call is made once (category-already-called)', () => {
    const state = onJob('drain-hose', 'same-day')
    const plan = { id: 'plan-1', expectedRevision: 2, type: 'decide-claim', optionId: 'lift-and-dry' }
    expect(reduceWorld(state, plan)).toEqual({ ok: false, code: 'category-not-called', state })
    const called = accepted(state, call(2))
    expect(reduceWorld(called, call(3, 3, 'call-2'))).toEqual({ ok: false, code: 'category-already-called', state: called })
  })

  it('B1 there is no call to make on today\'s claim, before a claim, or after the plan', () => {
    const today = onSite()
    expect(reduceWorld(today, call(1))).toEqual({ ok: false, code: 'invalid-stage', state: today })
    const noClaim = accepted(createWorld(), business())
    expect(reduceWorld(noClaim, call(1, 1))).toEqual({ ok: false, code: 'invalid-stage', state: noClaim })
    const decided = accepted(accepted(onJob('supply-hose', 'same-day'), call(1)),
      { id: 'plan-1', expectedRevision: 3, type: 'decide-claim', optionId: 'dry-in-place' })
    expect(reduceWorld(decided, call(1, 4, 'call-2'))).toEqual({ ok: false, code: 'invalid-stage', state: decided })
  })

  it.each([
    job('supply-hose', 'next-week'),
    job('kitchen-tap', 'same-day'),
    { ...job('supply-hose', 'same-day'), setup: { waterSource: 'supply-hose' } },
    { ...job('supply-hose', 'same-day'), setup: { waterSource: 'supply-hose', timeBeforeArrival: 'same-day', category: 1 } },
    { ...job('supply-hose', 'same-day'), setup: null },
    { ...job('supply-hose', 'same-day'), extra: true },
  ])('B1 a job setup with an unknown value, a missing or extra key is invalid and changes nothing %j', command => {
    const state = accepted(createWorld(), business())
    expect(reduceWorld(state, command)).toEqual({ ok: false, code: 'invalid-command', state })
  })

  it.each([0, 4, '2', 2.5, null, [2]])('B1 a call of %j is invalid and changes nothing', category => {
    const state = onJob('supply-hose', 'same-day')
    expect(reduceWorld(state, call(category))).toEqual({ ok: false, code: 'invalid-command', state })
    expect(reduceWorld(state, { ...call(1), extra: 1 })).toEqual({ ok: false, code: 'invalid-command', state })
  })

  it('B1 today\'s claim is unchanged apart from three empty fields, and stays one per world', () => {
    const today = onSite().claim
    expect(today).toMatchObject({ title: 'Burst washing machine supply hose: laundry and lounge', setup: null, siteNotes: [], categoryCall: null })
    const legacyPlan = accepted(onSite(), decideClaim('dry-in-place'))
    expect(legacyPlan.claim?.zones.map(z => z.dryingProgressPercent)).toEqual([100, 100, 100])
    const done = accepted(legacyPlan, completeClaim)
    expect(reduceWorld(done, { ...enter, id: 'e2', expectedRevision: 4 })).toEqual({ ok: false, code: 'invalid-stage', state: done })
  })

  it('B1 a built job may follow a completed claim, never one still open, and the business keeps what it earned', () => {
    const open = onSite()
    expect(reduceWorld(open, job('drain-hose', 'same-day', 2, 'job-2'))).toEqual({ ok: false, code: 'invalid-stage', state: open })
    const first = accepted(accepted(open, decideClaim('dry-in-place')), completeClaim)
    const second = accepted(first, job('drain-hose', 'four-warm-days', 4, 'job-2'))
    expect(second.claim).toMatchObject({ stage: 'on-site', setup: { waterSource: 'drain-hose', timeBeforeArrival: 'four-warm-days' } })
    expect(second.business?.stats).toEqual({ reputation: 6, businessCredits: 1650 })
    const openJob = accepted(second, call(3, 5, 'call-2'))
    expect(reduceWorld(openJob, job('supply-hose', 'same-day', 6, 'job-3'))).toEqual({ ok: false, code: 'invalid-stage', state: openJob })
  })

  it('B1 a built job replays byte for byte; a resent call is a no-op and a changed one is an id conflict', () => {
    const commands = [business(), job('supply-hose', 'four-warm-days'), call(3), { id: 'plan-1', expectedRevision: 3, type: 'decide-claim',
      optionId: 'replace-flooring' }, { id: 'done-1', expectedRevision: 4, type: 'complete-claim' }]
    const live = commands.reduce((s, c) => accepted(s, c), createWorld())
    const replayed = replayWorld(commands)
    expect(replayed.ok).toBe(true)
    expect(JSON.stringify(replayed.ok && replayed.state)).toBe(JSON.stringify(live))
    expect(live.history[1]).toEqual(job('supply-hose', 'four-warm-days'))
    expect(reduceWorld(live, call(3))).toEqual({ ok: true, state: live, replayed: true })
    expect(reduceWorld(live, call(2))).toEqual({ ok: false, code: 'id-conflict', state: live })
  })

  it('B1 the setup, the notes, the call and the stored command are frozen', () => {
    const state = accepted(onJob('supply-hose', 'same-day'), call(1))
    const claim = state.claim!
    for (const part of [claim.setup, claim.siteNotes, claim.categoryCall, claim.categoryCall?.accepted, (state.history[1] as { setup: object }).setup]) {
      expect(Object.isFrozen(part)).toBe(true)
    }
    expect(() => { (claim.categoryCall as { correct: boolean }).correct = false }).toThrow(TypeError)
  })
})
