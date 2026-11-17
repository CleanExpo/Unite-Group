// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createWorld, reduceWorld, SCHEMA_VERSION, type WorldState } from '../scenario'
import { WorldService } from '../service/world-service'
import { generate, schemaSha256 } from './gen-gdscript'

const schemaText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'world.schema.json'), 'utf8')
const defs = JSON.parse(schemaText).$defs

function statesForEveryStage(): WorldState[] {
  const service = new WorldService('test')
  return (['briefing', 'consequence', 'reflected', 'complete'] as const).map(stage => {
    service.testGoto(stage)
    return service.current
  })
}

/** Every state the person-record checks walk: a fresh world, then create, enter, decide and complete for each option. */
function personStates(): WorldState[] {
  const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
  const states: WorldState[] = [createWorld()]
  for (const optionId of defs.OptionId.enum as string[]) {
    let state = createWorld()
    for (const command of [
      { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address },
      { id: 'e', expectedRevision: 1, type: 'enter-claim' },
      { id: 'd', expectedRevision: 2, type: 'decide-claim', optionId },
      { id: 'f', expectedRevision: 3, type: 'complete-claim' },
    ]) {
      const result = reduceWorld(state, command)
      // A refusal throws: an early return here would pass the checks with nothing checked.
      if (!result.ok) throw new Error(`${command.type} was refused: ${result.code}`)
      state = result.state
      states.push(state)
    }
  }
  return states
}

describe('world.schema.json matches the reducer it describes', () => {
  it('WorldState required keys are exactly the keys the reducer produces', () => {
    for (const state of statesForEveryStage()) {
      expect(Object.keys(state).sort()).toEqual([...defs.WorldState.required].sort())
    }
  })

  it('every stage the reducer reaches is in the Stage enum, and every enum value is reachable', () => {
    expect(statesForEveryStage().map(s => s.stage)).toEqual(defs.Stage.enum)
  })

  it('every result code the reducer returns is in the ResultCode enum', () => {
    const world = createWorld()
    const codes = new Set<string>()
    const abroad = { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers',
      address: { line1: '1 Example St', suburb: 'Springfield', region: 'OR', postcode: '97477', country: 'US' } }
    for (const input of [null, { id: 'a', expectedRevision: 1, type: 'reflect' }, { id: 'a', expectedRevision: 0, type: 'reflect' }, abroad]) {
      const result = reduceWorld(world, input)
      if (!result.ok) codes.add(result.code)
    }
    const accepted = reduceWorld(world, { id: 'a', expectedRevision: 0, type: 'decide', choice: 'seek-support' })
    if (accepted.ok) {
      const conflict = reduceWorld(accepted.state, { id: 'a', expectedRevision: 0, type: 'decide', choice: 'rush-response' })
      if (!conflict.ok) codes.add(conflict.code)
    }
    // B1: a plan before the Category call, and a second call.
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const created = reduceWorld(world, { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address })
    const onJob = created.ok ? reduceWorld(created.state, { id: 'e', expectedRevision: 1, type: 'enter-claim',
      setup: { waterSource: 'drain-hose', timeBeforeArrival: 'same-day' } }) : created
    if (!onJob.ok) throw new Error('the built job was refused')
    const early = reduceWorld(onJob.state, { id: 'd', expectedRevision: 2, type: 'decide-claim', optionId: 'lift-and-dry' })
    if (!early.ok) codes.add(early.code)
    const called = reduceWorld(onJob.state, { id: 'c', expectedRevision: 2, type: 'call-category', category: 2 })
    if (!called.ok) throw new Error('the call was refused')
    const again = reduceWorld(called.state, { id: 'c2', expectedRevision: 3, type: 'call-category', category: 2 })
    if (!again.ok) codes.add(again.code)
    // A1: a house that does not suit, water and finish before the stops, a second stops call, finish before the water
    // call, and a second water call. Each step that must succeed throws if refused.
    if (!created.ok) throw new Error('create-business was refused')
    const must = (r: ReturnType<typeof reduceWorld>, what: string) => { if (!r.ok) throw new Error(`${what} was refused: ${r.code}`); return r.state }
    const refuse = (r: ReturnType<typeof reduceWorld>) => { if (!r.ok) codes.add(r.code) }
    refuse(reduceWorld(created.state, { id: 's0', expectedRevision: 1, type: 'start-job', scenarioId: 'W7', houseType: 'T1' }))
    const started = must(reduceWorld(created.state, { id: 's1', expectedRevision: 1, type: 'start-job', scenarioId: 'W1', houseType: 'T1' }), 'start-job')
    refuse(reduceWorld(started, { id: 'w0', expectedRevision: 2, type: 'call-water', category: 1, waterClass: 2 }))
    const stopped = must(reduceWorld(started, { id: 'p1', expectedRevision: 2, type: 'call-stops', stops: ['ELEC'] }), 'call-stops')
    refuse(reduceWorld(stopped, { id: 'p2', expectedRevision: 3, type: 'call-stops', stops: ['ELEC'] }))
    refuse(reduceWorld(stopped, { id: 'f0', expectedRevision: 3, type: 'finish-job' }))
    const watered = must(reduceWorld(stopped, { id: 'w1', expectedRevision: 3, type: 'call-water', category: 1, waterClass: 2 }), 'call-water')
    refuse(reduceWorld(watered, { id: 'w2', expectedRevision: 4, type: 'call-water', category: 1, waterClass: 2 }))
    // A3: finish with a decision open, and a decision called twice.
    refuse(reduceWorld(watered, { id: 'f1', expectedRevision: 4, type: 'finish-job' }))
    const decided = must(reduceWorld(watered, { id: 'd1', expectedRevision: 4, type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' }), 'call-decision')
    refuse(reduceWorld(decided, { id: 'd2', expectedRevision: 5, type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' }))
    // L3: an unknown person, a person added twice, a second open vacancy, a hire with no open vacancy, and a vacancy with
    // no candidates left.
    refuse(reduceWorld(created.state, { id: 'l0', expectedRevision: 1, type: 'add-person', personId: 'nobody', roles: ['administrator'] }))
    const added = must(reduceWorld(created.state, { id: 'l1', expectedRevision: 1, type: 'add-person', personId: 'riley-okafor', roles: ['administrator'] }), 'add-person')
    refuse(reduceWorld(added, { id: 'l2', expectedRevision: 2, type: 'add-person', personId: 'riley-okafor', roles: ['administrator'] }))
    refuse(reduceWorld(added, { id: 'l3', expectedRevision: 2, type: 'hire-candidate', vacancyId: 'vacancy-1', candidateId: 'sam-ellis' }))
    let hiring = must(reduceWorld(added, { id: 'l4', expectedRevision: 2, type: 'post-vacancy', role: 'administrator' }), 'post-vacancy')
    refuse(reduceWorld(hiring, { id: 'l5', expectedRevision: 3, type: 'post-vacancy', role: 'administrator' }))
    for (const [n, candidateId] of [[6, 'sam-ellis'], [8, 'noor-haddad']] as const) {
      const vacancyId = hiring.business?.vacancy?.id ?? ''
      hiring = must(reduceWorld(hiring, { id: `l${n}`, expectedRevision: hiring.revision, type: 'hire-candidate', vacancyId, candidateId }), 'hire')
      if (n === 6) hiring = must(reduceWorld(hiring, { id: 'l7', expectedRevision: hiring.revision, type: 'post-vacancy', role: 'administrator' }), 'post-vacancy')
    }
    refuse(reduceWorld(hiring, { id: 'l9', expectedRevision: hiring.revision, type: 'post-vacancy', role: 'administrator' }))
    expect([...codes].sort()).toEqual([...defs.ResultCode.enum].sort())
  })

  it('service-level codes and denial reasons match what the service returns', () => {
    const service = new WorldService('live', [{ id: 'local-test-identity', roles: ['technician'] }, { id: 'o', roles: ['owner'], personId: 'player' }])
    const unknown = service.handle({ id: 'a', expectedRevision: 0, type: 'reflect' }, 'nobody')
    const missing = service.handle({ id: 'a', expectedRevision: 0, type: 'reflect' }, 'o')
    // L3: the scenario-only identity is not in the people list, so it may not add a person.
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    expect(service.handle({ id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address }, 'o').ok).toBe(true)
    const notPermitted = service.handle({ id: 'p', expectedRevision: 1, type: 'add-person', personId: 'riley-okafor', roles: ['administrator'] }, 'local-test-identity')
    // Every service-level code the service can return, each produced here: a refusal, and an allowed read of a person who
    // does not exist (GET /people/<id>/record answers it as 404).
    const notFound = service.readRecord('o', 'no-such-person')
    expect(defs.ServiceCode.enum).toEqual([unknown.ok ? '' : unknown.code, notFound.ok ? '' : notFound.code])
    expect(defs.DenialReason.enum).toEqual([unknown, missing, notPermitted].map(r => (r as { reason: string }).reason))
  })

  it('every address refusal reason the reducer returns is in the AddressReason enum, and each is reachable', () => {
    const base = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const reasons = [{ ...base, country: 'US' }, { ...base, region: 'XX' }, { ...base, postcode: '40060' }].map(address => {
      const result = reduceWorld(createWorld(), { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address })
      return !result.ok && result.code === 'invalid-address' ? result.reason : undefined
    })
    expect(reasons).toEqual(defs.AddressReason.enum)
  })

  it('the Country and Currency enums are exactly the values both country paths produce, and a business carries the five listed areas in order', () => {
    // Membership of one value proved nothing about the rest of the enum (review L1 round 1, finding 5): compare whole sets.
    const addresses = [
      { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' },
      { line1: '5 Fictional Ave', suburb: 'Ponsonby', region: 'Auckland', postcode: '1011', country: 'NZ' },
    ]
    const made = addresses.map(address => {
      const result = reduceWorld(createWorld(), { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address })
      expect(result.ok).toBe(true)
      return result.ok ? result.state : createWorld()
    })
    expect([...new Set(made.map(s => s.business?.address.country))].sort()).toEqual([...defs.Country.enum].sort())
    expect([...new Set(made.map(s => s.business?.currency))].sort()).toEqual([...defs.Currency.enum].sort())
    for (const state of made) {
      expect(state.homeBase?.areas.map(a => a.id)).toEqual(defs.AreaId.enum)
      expect(Object.keys(state.business?.stats ?? {})).toEqual(defs.Business.properties.stats.required)
    }
  })

  it('the CommandType enum is exactly the set of types the reducer accepts (review L1 round 2, finding 2)', () => {
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const acceptedTypes = new Set<string>()
    let state = createWorld()
    for (const command of [
      { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address },
      { id: 'a', expectedRevision: 1, type: 'decide', choice: 'seek-support' },
      { id: 'r', expectedRevision: 2, type: 'reflect' },
      { id: 'c', expectedRevision: 3, type: 'complete' },
      { id: 'e', expectedRevision: 4, type: 'enter-claim' },
      { id: 'd', expectedRevision: 5, type: 'decide-claim', optionId: 'dry-in-place' },
      { id: 'f', expectedRevision: 6, type: 'complete-claim' },
      { id: 's', expectedRevision: 7, type: 'start-job', scenarioId: 'W1', houseType: 'T1' },
      { id: 'p', expectedRevision: 8, type: 'call-stops', stops: ['ELEC', 'TRADE'] },
      { id: 'w', expectedRevision: 9, type: 'call-water', category: 1, waterClass: 2 },
      { id: 'q1', expectedRevision: 10, type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' },
      { id: 'q2', expectedRevision: 11, type: 'call-decision', decisionId: 'air-movers', optionId: 'three-four' },
      { id: 'g', expectedRevision: 12, type: 'finish-job' },
      { id: 'j', expectedRevision: 13, type: 'enter-claim', setup: { waterSource: 'supply-hose', timeBeforeArrival: 'same-day' } },
      { id: 'k', expectedRevision: 14, type: 'call-category', category: 1 },
      { id: 'l1', expectedRevision: 15, type: 'add-person', personId: 'riley-okafor', roles: ['senior-technician'] },
      { id: 'l2', expectedRevision: 16, type: 'change-roles', personId: 'riley-okafor', roles: ['senior-technician', 'administrator'] },
      { id: 'l3', expectedRevision: 17, type: 'post-vacancy', role: 'senior-technician' },
      { id: 'l4', expectedRevision: 18, type: 'hire-candidate', vacancyId: 'vacancy-18', candidateId: 'mia-tran' },
      { id: 'x', expectedRevision: 19, type: 'other' },
    ]) {
      const result = reduceWorld(state, command)
      if (result.ok) {
        acceptedTypes.add(command.type)
        state = result.state
      }
    }
    expect([...acceptedTypes].sort()).toEqual([...defs.CommandType.enum].sort())
  })

  it('the Choice enum is exactly the set of choices a decide command may carry', () => {
    const acceptedChoices = new Set<string>()
    for (const choice of ['seek-support', 'rush-response', 'other']) {
      if (reduceWorld(createWorld(), { id: 'a', expectedRevision: 0, type: 'decide', choice }).ok) acceptedChoices.add(choice)
    }
    expect([...acceptedChoices].sort()).toEqual([...defs.Choice.enum].sort())
  })

  it('the ServiceMode enum is exactly the set of modes the service constructs', () => {
    const constructed = new Set<string>()
    for (const mode of ['live', 'test', 'other']) {
      try { new WorldService(mode as 'live'); constructed.add(mode) } catch { /* refused */ }
    }
    expect([...constructed].sort()).toEqual([...defs.ServiceMode.enum].sort())
  })

  it('L2: the claim enums are exactly what the reducer produces and accepts, and a claim has exactly the schema keys', () => {
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const created = reduceWorld(createWorld(), { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address })
    const entered = created.ok ? reduceWorld(created.state, { id: 'e', expectedRevision: 1, type: 'enter-claim' }) : created
    // A refusal throws: an early return here would pass the test with nothing checked.
    if (!entered.ok || !entered.state.claim) throw new Error('enter-claim was refused')
    const onSite = entered.state
    const claim = entered.state.claim
    expect(Object.keys(claim).sort()).toEqual([...defs.Claim.required].sort())
    expect(claim.zones.map(z => z.id)).toEqual(defs.ZoneId.enum)
    expect([...new Set(claim.zones.map(z => z.surface))].sort()).toEqual([...defs.ZoneSurface.enum].sort())
    expect(claim.options.map(o => o.id)).toEqual(defs.OptionId.enum)
    for (const option of claim.options) {
      expect(Object.keys(option).sort()).toEqual([...defs.Claim.properties.options.items.required].sort())
      expect(Object.keys(option.effects).sort()).toEqual([...defs.Claim.properties.options.items.properties.effects.required].sort())
    }
    // Every option id the enum lists is accepted by decide-claim, and nothing else is.
    const accepted = new Set<string>()
    for (const optionId of [...defs.OptionId.enum, 'other']) {
      if (reduceWorld(onSite, { id: 'd', expectedRevision: 2, type: 'decide-claim', optionId }).ok) accepted.add(optionId)
    }
    expect([...accepted].sort()).toEqual([...defs.OptionId.enum].sort())
    // The claim stages the reducer reaches, in order, are exactly the ClaimStage enum.
    const decided = reduceWorld(onSite, { id: 'd', expectedRevision: 2, type: 'decide-claim', optionId: 'dry-in-place' })
    const completed = decided.ok ? reduceWorld(decided.state, { id: 'f', expectedRevision: 3, type: 'complete-claim' }) : decided
    expect([onSite, decided.state, completed.state].map(s => s.claim?.stage)).toEqual(defs.ClaimStage.enum)
  })

  it('B1: the builder enums are exactly what the home base offers, the Category enum is exactly what a call accepts, and a judged claim has exactly the schema keys', () => {
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const created = reduceWorld(createWorld(), { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address })
    if (!created.ok || !created.state.homeBase) throw new Error('create-business was refused')
    const builder = created.state.homeBase.jobBuilder
    expect(Object.keys(created.state.homeBase).sort()).toEqual([...defs.HomeBase.required].sort())
    expect(builder.waterSources.map(o => o.id)).toEqual(defs.WaterSource.enum)
    expect(builder.timesBeforeArrival.map(o => o.id)).toEqual(defs.TimeBeforeArrival.enum)
    const onJob = reduceWorld(created.state, { id: 'e', expectedRevision: 1, type: 'enter-claim',
      setup: { waterSource: 'supply-hose', timeBeforeArrival: 'four-warm-days' } })
    if (!onJob.ok) throw new Error('the built job was refused')
    const calls = new Set<unknown>()
    for (const category of [0, ...defs.WaterCategory.enum, 4]) {
      if (reduceWorld(onJob.state, { id: 'c', expectedRevision: 2, type: 'call-category', category }).ok) calls.add(category)
    }
    expect([...calls]).toEqual(defs.WaterCategory.enum)
    const judged = reduceWorld(onJob.state, { id: 'c', expectedRevision: 2, type: 'call-category', category: 2 })
    if (!judged.ok || !judged.state.claim?.categoryCall) throw new Error('the call was refused')
    expect(Object.keys(judged.state.claim).sort()).toEqual([...defs.Claim.required].sort())
    expect(Object.keys(judged.state.claim.categoryCall).sort()).toEqual([...defs.Claim.properties.categoryCall.oneOf[1].required].sort())
    expect(Object.keys(judged.state.claim.setup ?? {}).sort()).toEqual([...defs.JobSetup.required].sort())
  })

  it('A1: the library enums are exactly the library data, and the library, a house, a scenario, a job and both calls have exactly the schema keys', () => {
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    let state = createWorld()
    for (const command of [
      { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address },
      { id: 's', expectedRevision: 1, type: 'start-job', scenarioId: 'W1', houseType: 'T2' },
      { id: 'p', expectedRevision: 2, type: 'call-stops', stops: ['ELEC'] },
      { id: 'w', expectedRevision: 3, type: 'call-water', category: 2, waterClass: 2 },
    ]) {
      const result = reduceWorld(state, command)
      if (!result.ok) throw new Error(`${command.type} was refused: ${result.code}`)
      state = result.state
    }
    const library = state.homeBase?.library
    const job = state.job
    if (!library || !job?.stopsCall || !job.waterCall) throw new Error('no library or no judged job')
    expect(library.houses.map(h => h.id)).toEqual(defs.HouseTypeId.enum)
    expect(library.scenarios.map(x => x.id)).toEqual(defs.ScenarioId.enum)
    expect(library.families.map(f => f.id)).toEqual(defs.ScenarioFamily.enum)
    expect(library.stops.map(x => x.id)).toEqual(defs.SafetyStop.enum)
    expect([...new Set(library.scenarios.map(x => x.waterCall))].sort()).toEqual([...defs.WaterCallKind.enum].sort())
    expect(Object.keys(library).sort()).toEqual([...defs.Library.required].sort())
    expect(Object.keys(library.houses[0]).sort()).toEqual([...defs.HouseType.required].sort())
    // A2: every house's model has exactly the schema keys, and the finishes and roof forms in use are the schema enums.
    for (const h of library.houses) expect(Object.keys(h.model).sort()).toEqual([...defs.HouseModel.required].sort())
    const used = (key: 'wallFinish' | 'roofForm' | 'roofFinish') => [...new Set(library.houses.map(h => h.model[key]))].sort()
    expect(used('wallFinish')).toEqual([...defs.HouseModel.properties.wallFinish.enum].sort())
    expect(used('roofForm')).toEqual([...defs.HouseModel.properties.roofForm.enum].sort())
    expect(used('roofFinish')).toEqual([...defs.HouseModel.properties.roofFinish.enum].sort())
    expect(Object.keys(library.scenarios[0]).sort()).toEqual([...defs.ScenarioSummary.required].sort())
    expect(Object.keys(job).sort()).toEqual([...defs.LibraryJob.required].sort())
    expect(Object.keys(job.stopsCall).sort()).toEqual([...defs.StopsCall.required].sort())
    expect(Object.keys(job.waterCall).sort()).toEqual([...defs.WaterCall.required].sort())
  })

  it('both consequence kinds are produced and listed', () => {
    const kinds = (['seek-support', 'rush-response'] as const).map(choice => {
      const result = reduceWorld(createWorld(), { id: 'a', expectedRevision: 0, type: 'decide', choice })
      return result.ok ? result.state.consequence?.kind : undefined
    })
    expect(kinds).toEqual(defs.ConsequenceKind.enum)
  })

  it('A3: person, person.stats, a tenure and business.stats have exactly the schema keys', () => {
    const states = personStates()
    for (const state of states) {
      expect(Object.keys(state.person).sort()).toEqual([...defs.Person.required].sort())
      expect(Object.keys(state.person.stats).sort()).toEqual([...defs.Person.properties.stats.required].sort())
      for (const tenure of state.person.businesses) expect(Object.keys(tenure).sort()).toEqual([...defs.BusinessTenure.required].sort())
    }
    const created = states[1]
    expect(created.person.businesses).toHaveLength(1)
    expect(Object.keys(created.business?.stats ?? {}).sort()).toEqual([...defs.Business.properties.stats.required].sort())
    expect(Object.keys(created.business?.stats ?? {}).sort()).toEqual(['businessCredits', 'reputation'])
  })

  it('I1: a tenure exists exactly when a business does, and every tenure is open', () => {
    for (const state of [...statesForEveryStage(), ...personStates()]) {
      expect(state.person.businesses).toHaveLength(state.business === null ? 0 : 1)
      for (const tenure of state.person.businesses) expect(tenure.endRevision).toBeNull()
    }
  })

  it('I4: credentials, hours, capability and industry contribution stay within the schema bounds', () => {
    // The bounds are read from the schema, so writing a credential fails here until someone edits the schema.
    const bounds = defs.Person.properties
    expect(bounds.credentials.maxItems).toBe(0)
    for (const state of [...statesForEveryStage(), ...personStates()]) {
      expect(state.person.credentials.length).toBeLessThanOrEqual(bounds.credentials.maxItems)
      expect(state.person.hours).toBe(bounds.hours.const)
      expect(state.person.stats.capability).toBe(bounds.stats.properties.capability.const)
      expect(state.person.stats.industryContribution).toBe(bounds.stats.properties.industryContribution.const)
    }
  })
})

describe('GDScript generation', () => {
  it('embeds the schema hash and is deterministic', () => {
    const a = generate(schemaText)
    expect(a).toContain(`const SCHEMA_SHA256 := "${schemaSha256(schemaText)}"`)
    expect(generate(schemaText)).toBe(a)
  })

  it('hash ignores CRLF vs LF', () => {
    expect(schemaSha256('a\r\nb')).toBe(schemaSha256('a\nb'))
  })

  const withVersion = (edit: (version: Record<string, unknown>) => void) => {
    const schema = JSON.parse(schemaText)
    edit(schema.$defs.WorldState.properties.schemaVersion)
    return JSON.stringify(schema)
  }

  it('emits SCHEMA_VERSION from the schema const', () => {
    expect(generate(withVersion(v => { v.const = 3 })).split('\n')).toContain('const SCHEMA_VERSION := 3')
  })

  it('refuses a schemaVersion const that is absent', () => {
    expect(() => generate(withVersion(v => { delete v.const }))).toThrow(/schemaVersion/)
  })

  it('refuses a schemaVersion const that is a string', () => {
    expect(() => generate(withVersion(v => { v.const = '1' }))).toThrow(/schemaVersion/)
  })

  it('refuses a schemaVersion const that is not a whole number', () => {
    expect(() => generate(withVersion(v => { v.const = 1.5 }))).toThrow(/schemaVersion/)
  })
})

describe('A3 generator', () => {
  it('A3 every command type in the schema has a constructor in rw_types.gd', () => {
    const out = generate(schemaText)
    const missing = (defs.CommandType.enum as string[]).filter(t => {
      const name = `COMMANDTYPE_${t.toUpperCase().replace(/-/g, '_')}`
      return !out.includes(`"type": ${name}`)
    })
    expect(missing).toEqual([])
    expect(out).toContain('static func call_decision(id: String, expected_revision: int, decision_id: String, option_id: String) -> Dictionary:')
  })
})

describe('one schema version', () => {
  it('the schema const, the schema title and SCHEMA_VERSION agree', () => {
    const titled = /schemaVersion (\d+)/.exec(JSON.parse(schemaText).title)
    expect(titled).not.toBeNull()
    expect(defs.WorldState.properties.schemaVersion.const).toBe(SCHEMA_VERSION)
    expect(Number(titled![1])).toBe(SCHEMA_VERSION)
  })
})
