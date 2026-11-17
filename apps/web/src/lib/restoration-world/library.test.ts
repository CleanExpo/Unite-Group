import { describe, expect, it } from 'vitest'
import {
  checkLibrary, DECISIONS, HOUSE_TYPES, LIBRARY, SCENARIOS, scenarioById, stopsFor, type HouseModel, type HouseTypeId, type SafetyStop,
} from './library'
import { createWorld, reduceWorld, type WorldState } from './scenario'

const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }

function withBusiness(): WorldState {
  const r = reduceWorld(createWorld(), { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address })
  if (!r.ok) throw new Error('create-business refused')
  return r.state
}

function send(state: WorldState, command: Record<string, unknown>): WorldState {
  const r = reduceWorld(state, { id: `c${state.revision}`, expectedRevision: state.revision, ...command })
  if (!r.ok) throw new Error(`${String(command.type)} refused: ${r.code}`)
  return r.state
}

function code(state: WorldState, command: Record<string, unknown>): string {
  const r = reduceWorld(state, { id: `c${state.revision}`, expectedRevision: state.revision, ...command })
  return r.ok ? 'accepted' : r.code
}

// A3: every scenario has decisions, and a job finishes only once each is called.
function decideAll(state: WorldState): WorldState {
  const scenario = SCENARIOS.find(x => x.id === state.job?.scenarioId)!
  for (const x of DECISIONS[scenario.id] ?? []) state = send(state, { type: 'call-decision', decisionId: x.id, optionId: x.right })
  return state
}

describe('A1 scenario library', () => {
  it('A1 holds 10 houses and the 49 catalogue scenarios in their family counts', () => {
    expect(HOUSE_TYPES.map(h => h.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'])
    const count = (prefix: RegExp) => SCENARIOS.filter(x => prefix.test(x.id)).length
    expect([count(/^W\d/), count(/^WM/), count(/^M\d/), count(/^F\d/), count(/^C\d/), count(/^B\d/)]).toEqual([10, 10, 5, 5, 3, 3])
    expect(SCENARIOS.length).toBe(49)
  })

  it('A1 a new business sees the whole library, and the summary carries no answers', () => {
    const library = withBusiness().homeBase?.library
    expect(library?.scenarios.length).toBe(49)
    expect(library?.houses.length).toBe(10)
    const text = JSON.stringify(library?.scenarios)
    // Keys, not words: "water" is also a family name on the wire.
    for (const answer of ['"stops":', '"water":', '"categories":', '"classes":', 'catalogue']) expect(text).not.toContain(answer)
  })

  it('A1 the stops are the scenario\'s own plus asbestos before 1990 and lead before 1970', () => {
    const w1 = SCENARIOS.find(x => x.id === 'W1')!
    expect(stopsFor(w1, HOUSE_TYPES.find(h => h.id === 'T1')!)).toEqual(['ELEC', 'TRADE'])
    expect(stopsFor(w1, HOUSE_TYPES.find(h => h.id === 'T5')!)).toEqual(['ELEC', 'ASB', 'LEAD', 'TRADE'])
  })

  it('A1 a house that does not suit the scenario is refused and the state is unchanged', () => {
    const state = withBusiness()
    const r = reduceWorld(state, { id: 's', expectedRevision: 1, type: 'start-job', scenarioId: 'W7', houseType: 'T1' })
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.code).toBe('house-not-suited')
    expect(r.state).toBe(state)
    expect(LIBRARY.scenarios.find(x => x.id === 'W7')?.houseRule).toContain('units above or beside')
  })

  it('A1 a missed stop is wrong and named with its reason; an extra stop is noted, not wrong', () => {
    let state = send(withBusiness(), { type: 'start-job', scenarioId: 'W1', houseType: 'T5' })
    state = send(state, { type: 'call-stops', stops: ['ELEC', 'TRADE', 'POLICE'] })
    const call = state.job?.stopsCall
    expect(call?.correct).toBe(false)
    expect(call?.missed).toEqual(['ASB', 'LEAD'])
    expect(call?.extra).toEqual(['POLICE'])
    expect(call?.why).toContain('before 1990')
    expect(call?.why).toContain('Not needed on this job: Police release.')
  })

  it('A1 the water call is judged on Category and Class from the catalogue row', () => {
    let state = send(withBusiness(), { type: 'start-job', scenarioId: 'W8', houseType: 'T1' })
    state = send(state, { type: 'call-stops', stops: ['ELEC', 'TRADE'] })
    const wrong = send(state, { type: 'call-water', category: 2, waterClass: 2 }).job?.waterCall
    expect(wrong?.correct).toBe(false)
    expect(wrong?.why).toContain('this job is Category 1')
    expect(wrong?.why).toContain('Class 3 or Class 4')
    expect(send(state, { type: 'call-water', category: 1, waterClass: 4 }).job?.waterCall?.correct).toBe(true)
  })

  it('A1 a job with no Class to call takes waterClass null only, and a job with a Class takes a number only', () => {
    let flood = send(withBusiness(), { type: 'start-job', scenarioId: 'ST1', houseType: 'T3' })
    flood = send(flood, { type: 'call-stops', stops: ['ELEC', 'PPE', 'ASB', 'LEAD'] })
    expect(code(flood, { type: 'call-water', category: 3, waterClass: 2 })).toBe('invalid-command')
    expect(send(flood, { type: 'call-water', category: 3, waterClass: null }).job?.waterCall?.correct).toBe(true)
    let hose = send(withBusiness(), { type: 'start-job', scenarioId: 'W1', houseType: 'T1' })
    hose = send(hose, { type: 'call-stops', stops: ['ELEC'] })
    expect(code(hose, { type: 'call-water', category: 1, waterClass: null })).toBe('invalid-command')
  })

  it('A1 safety comes first: no water call and no finish before the stops, and no finish before a needed water call', () => {
    const state = send(withBusiness(), { type: 'start-job', scenarioId: 'W1', houseType: 'T1' })
    expect(code(state, { type: 'call-water', category: 1, waterClass: 2 })).toBe('stops-not-called')
    expect(code(state, { type: 'finish-job' })).toBe('stops-not-called')
    expect(code(send(state, { type: 'call-stops', stops: [] }), { type: 'finish-job' })).toBe('water-not-called')
  })

  it('A1 a scenario with no water finishes after the stops and its decisions; a water call on it is refused', () => {
    let fire = send(withBusiness(), { type: 'start-job', scenarioId: 'F1', houseType: 'T1' })
    fire = send(fire, { type: 'call-stops', stops: ['ELEC', 'PPE'] })
    expect(code(fire, { type: 'call-water', category: 1, waterClass: null })).toBe('invalid-stage')
    expect(send(decideAll(fire), { type: 'finish-job' }).job?.stage).toBe('complete')
  })

  it('A1 one job at a time, never during an L2 claim, and the next job may start after a finish', () => {
    const base = withBusiness()
    const onJob = send(base, { type: 'start-job', scenarioId: 'M1', houseType: 'T1' })
    expect(code(onJob, { type: 'start-job', scenarioId: 'M2', houseType: 'T1' })).toBe('invalid-stage')
    const onClaim = send(base, { type: 'enter-claim' })
    expect(code(onClaim, { type: 'start-job', scenarioId: 'M1', houseType: 'T1' })).toBe('invalid-stage')
    expect(code(onJob, { type: 'enter-claim' })).toBe('invalid-stage')
    expect(code(onJob, { type: 'enter-claim', setup: { waterSource: 'supply-hose', timeBeforeArrival: 'same-day' } }))
      .toBe('invalid-stage')
    const done = send(decideAll(send(onJob, { type: 'call-stops', stops: ['PPE'] })), { type: 'finish-job' })
    expect(send(done, { type: 'start-job', scenarioId: 'M2', houseType: 'T1' }).job?.scenarioId).toBe('M2')
  })

  it('A1 unknown ids, repeated stops and extra keys are invalid commands', () => {
    const state = withBusiness()
    expect(code(state, { type: 'start-job', scenarioId: 'W11', houseType: 'T1' })).toBe('invalid-command')
    expect(code(state, { type: 'start-job', scenarioId: 'W1', houseType: 'T11' })).toBe('invalid-command')
    expect(code(state, { type: 'start-job', scenarioId: 'W1', houseType: 'T1', answer: 'x' })).toBe('invalid-command')
    const onJob = send(state, { type: 'start-job', scenarioId: 'W1', houseType: 'T1' })
    expect(code(onJob, { type: 'call-stops', stops: ['ELEC', 'ELEC'] })).toBe('invalid-command')
    expect(code(onJob, { type: 'call-stops', stops: ['GAS'] })).toBe('invalid-command')
  })

  it('A1 every scenario plays to the end on every house that suits it, and right answers are judged right', () => {
    let played = 0
    for (const scenario of SCENARIOS) {
      for (const house of HOUSE_TYPES) {
        const base = withBusiness()
        if (!scenario.houses.includes(house.id)) {
          expect(code(base, { type: 'start-job', scenarioId: scenario.id, houseType: house.id })).toBe('house-not-suited')
          continue
        }
        let state = send(base, { type: 'start-job', scenarioId: scenario.id, houseType: house.id })
        state = send(state, { type: 'call-stops', stops: [...stopsFor(scenario, house)] as SafetyStop[] })
        expect(state.job?.stopsCall?.correct).toBe(true)
        if (scenario.water) {
          state = send(state, { type: 'call-water', category: scenario.water.categories[0], waterClass: scenario.water.classes?.[0] ?? null })
          expect(state.job?.waterCall?.correct).toBe(true)
        }
        // A3: a job with decisions finishes only once each is called.
        for (const x of DECISIONS[scenario.id] ?? []) {
          state = send(state, { type: 'call-decision', decisionId: x.id, optionId: x.right })
          expect(state.job?.decisions.find(y => y.id === x.id)?.call?.correct).toBe(true)
        }
        expect(send(state, { type: 'finish-job' }).job?.stage).toBe('complete')
        played++
      }
    }
    // The count of playable house and scenario pairs; it changes only when a house rule changes.
    expect(played).toBe(SCENARIOS.reduce((n, x) => n + x.houses.length, 0))
    expect(played).toBeGreaterThan(400)
  })
})

describe('A3 decisions', () => {
  // W1 on T1 needs ELEC and TRADE, then Category 1, Class 2.
  function w1Called(): WorldState {
    let state = send(withBusiness(), { type: 'start-job', scenarioId: 'W1', houseType: 'T1' })
    state = send(state, { type: 'call-stops', stops: ['ELEC', 'TRADE'] })
    return send(state, { type: 'call-water', category: 1, waterClass: 2 })
  }

  it('A3 every scenario has two decisions, each with a reason and a source', () => {
    const all = SCENARIOS.map(x => x.id)
    expect(Object.keys(DECISIONS).sort()).toEqual([...all].sort())
    for (const id of all) {
      expect(DECISIONS[id]?.length).toBe(2)
      for (const x of DECISIONS[id] ?? []) {
        expect(x.options.map(o => o.id)).toContain(x.right)
        expect(x.source).toMatch(/^((S500:2021|S520|S700|S540|S900) |(NSW|Vic|Qld|WHS|FRV) )/)
      }
    }
    // The right option is not always listed first.
    expect(Object.values(DECISIONS).flat().some(x => x?.options[0].id !== x?.right)).toBe(true)
  })

  it('A3 no decision source is unverified: each names what was read', () => {
    // Founder 22/10/2026: research until no UNV is left (session-artifacts a3-sources-research).
    const all = Object.values(DECISIONS).flat()
    expect(all.length).toBe(98)
    for (const x of all) expect(x?.source ?? '').not.toMatch(/UNV/)
  })

  it('A3 the answer key: each decision\'s right option and source, as reviewed against the standards facts', () => {
    // A second record of the answers (session-artifacts a3/water-decisions-draft.md and a3/wave2-decisions-draft.md): an
    // answer or source changed in DECISIONS without changing this key turns the test red, so a content edit is never silent.
    const key: Record<string, string> = {
      'W1/carpet': 'dry-in-place | S500:2021 16.3.7; Appendix C (informative)', 'W1/air-movers': 'three-four | S500:2021 12.5.3',
      'W2/first-step': 'isolate | S500:2021 12.2.4, 12.2.5; AS/NZS 3500.4 temperatures (60 C stored, 50 C at fixtures) per Tas CBOS 2020; scald times: Moritz and Henriques 1947', 'W2/plasterboard': 'dry-monitor | S500:2021 16.2.2, 12.5.6',
      'W3/hidden': 'under | S500:2021 10.6.3', 'W3/cabinets': 'remove | S500:2021 16.2.2.1',
      'W4/thermal': 'meter | S500:2021 10.6.8', 'W4/insulation': 'remove | S500:2021 16.2.2.1',
      'W5/repair': 'licensed-trade | S500:2021 1.2.3, 1.2.5', 'W5/moisture-map': 'source-out | S500:2021 10.6.3',
      'W6/ceiling': 'remove | S500:2021 16.2.2', 'W6/cellulose': 'remove | S500:2021 16.3.6',
      'W7/authority': 'owners-corp | NSW SSMA 2015 s106, SSDA 2015 s6; Vic OC Act 2006 s46; Qld BCCM Act 1997 s152', 'W7/records': 'both-units | S500:2021 10.6.3, 1.2.2',
      'W8/dehumidifier': 'lgr-desiccant | S500:2021 Appendix B (informative)', 'W8/goal': 'dry-standard | S500:2021 10.6.6',
      'W9/dry-standard': 'unaffected | S500:2021 10.6.6', 'W9/cupping': 'dry-readings | S500:2021 12.5.6; ATFA Floor Choices, owner expectations for solid timber floors (no sanding until moisture evens out)',
      'W10/chambers': 'chambers | S500:2021 Class definitions', 'W10/sprinkler-category': 'public-supply | S500:2021 16.3.17',
      'WM1/mould-found': 'stop-contain-follow | S500:2021 8.6; S520 1.3, 9.3.3',
      'WM1/skirting': 'remove | S500:2021 16.2.2.1',
      'WM2/debris': 'double-bag | S500:2021 12.3',
      'WM2/order': 'remove-clean-contaminated | S500:2021 1.2.3, 12.3',
      'WM3/insulation': 'remove-them | S500:2021 16.2.2',
      'WM3/bagging': 'cut-knife-bag | S500:2021 12.3',
      'WM4/containment': 'plastic-containment-air | S500:2021 12.3, 8.6; S520 9.3.3',
      'WM4/readings': 'bathroom-bedroom-out | S500:2021 10.6.3',
      'WM5/entry': 'shock-risk-sharp | S500:2021 10.7.5, 12.2.4',
      'WM5/system': 'open-ventilate-outdoor | S500:2021 12.5.1',
      'WM6/source': 'owner-through-licensed | S500:2021 1.2.3, 1.2.5',
      'WM6/hvac': 'only-if-will | S500:2021 12.5.5',
      'WM7/records': 'source-time-loss | S500:2021 1.2.2.1',
      'WM7/authority': 'owner-landlord-or | NSW RTA 2010 urgent repairs (NSW Fair Trading: $1,000, repaid in 14 days); Vic RTA 1997 s72 (CAV: $2,500; mould or damp from the building)',
      'WM8/plasterboard': 'remove | S500:2021 16.2.2.2',
      'WM8/iep': 'recommend-indoor-environmental | S500:2021 10.6.7, 12.3; S520 1.2.1, 7.4',
      'WM9/shared-wall': 'owners-corporation | NSW SSDA 2015 s6, SSMA 2015 s106; Vic OC Act 2006 s46, s47A; Qld BCCM Act 1997 s152',
      'WM9/readings': 'both-units-out | S500:2021 10.6.3',
      'WM10/class4': 'class-4-special | S500:2021 Class definitions',
      'WM10/falling-rate': 'slow-air-warm | S500:2021 12.5',
      'M1/removal': 'remove-growth-hepa | S520 1.4, 2.1.1, 2.2.1',
      'M1/source': 'fix-moisture-ventilation | S520 1.5',
      'M2/fan': 'licensed-electrician | S520 1.5; S500:2021 1.2.5',
      'M2/stain': 'record-cosmetic-stain | S520 9.3.8, 2.1.1',
      'M3/triage': 'sort-each-item | S520 11.1, 11.3.5, 11.4',
      'M3/disposal': 'no-photograph-list | S520 11.2, 11.5',
      'M4/pressure': 'negative-pressure-least | S520 3.2, 9.3.3',
      'M4/timber': 'stop-structural-engineer | S520 9, 9.3.7',
      'M5/hvac': 'keep-off-until | S520 10.2.2',
      'M5/duct': 'remove-replace-that | S520 10, 10.2.4, 9.1.7',
      'F1/residue': 'protein-residue-test | S700 3.1, 6.6.1.1, 6.5',
      'F1/test': 'origin-gentlest-method | S700 3.11',
      'F2/power': 'no-never-work | S700 5.5.3.2',
      'F2/evidence': 'leave-until-investigator | S700 5.4.4',
      'F3/corrosion': 'now-burnt-plastic | S700 3.13, 5.5.3, 5.5.3.2',
      'F3/battery': 'do-not-handle | FRV What to do after a fire (reignition up to 4 weeks; 5 m); FRNSW e-bike battery safety (3 m; no home bins; water for small batteries only)',
      'F4/water': 'least-category-2 | S700 5.2.3 by analogy (S700:2025 excludes bushfire; a wildfire revision began 26/12/2025); NSW Gov bushfire clean-up advice 2023',
      'F4/insulation': 'remove-them-burnt | S700 6.5.1, 8.4.1 by analogy; NSW Gov bushfire clean-up advice 2023 (damp, shovel, bag, P2); Alam et al. 2023 doi:10.1016/j.jhazmat.2022.130608',
      'F5/soot': 'hepa-vacuum-loose | S700 3.1, 6.6.1, 6.6.1.1',
      'F5/clean': 'wipe-dry-white | S700 6.10.1',
      'C1/release': 'wait-police-release | S540 A.1, 7.4',
      'C1/carpet': 'clean-disinfect-surface | S540 8.1, 8.10.1, 8.10.3',
      'C2/family': 'speak-calmly-explain | S540 5.2.1, 8.10.3',
      'C2/welfare': 'debrief-them-offer | S540 2.1; WHS Regs 2011 r55A-55D (from 1/4/2023); StandBy Support After Suicide; Lifeline 13 11 14',
      'C3/spray': 'extra-ppe-work | S540 7.3',
      'C3/powder': 'treat-contaminant-hepa | S540 8.1; NSW Police crime scene clean up (dry first, then an ammonia-based cleaner)',
      'B1/spread': 'lift-follow-fluid | S540 8.3, 8.10.2',
      'B1/odour': 'only-after-cleaning | S540 8.11.4, 8.11.5',
      'B2/sharps': 'into-closed-puncture | S540 11.3.2',
      'B2/needlestick': 'first-aid-tell | S540 8.9',
      'B3/order': 'clean-detergent-then | S540 8.11.1, 8.11.3',
      'B3/product': 'registered-product-that | S540 3.2, 8.11.3',
      'CL1/test': 'independent-specialist-wipe | S900 3.5.2',
      'CL1/clear': 'independent-sampling-lab | S900 14.2, 14.2.1, 14.2.3, 1.2',
      'CL2/first': 'test-first-find | S900 10.1, 3.5.2',
      'CL2/hvac': 'shut-down-until | S900 10.5',
      'ST2/entry': 'not-until-structure | S500:2021 12.2.4; S700 5.3',
      'ST2/cover': 'stop-water-temporary | S500:2021 12.2.5; S700 5.3',
      'ST3/ceiling': 'keep-everyone-out | S500:2021 12.2.4',
      'ST3/insulation': 'remove-them | S500:2021 16.2.2',
      'HS1/access': 'make-safe-access | S500:2021 8.1, 12.2.4 (structural soundness before entry)',
      'HS1/person': 'treat-them-respect | S540 5.2.1, 8.10.3 (by analogy); WA Health Hoarding and squalor guideline 2026; Vic DH Responding to hoarding and squalor 2013',
      'HS2/category': '3 | S500:2021 Category definitions',
      'HS2/pests': 'arrange-pest-control | S540 8.1; AEPMA Rodent Management Code v1.3i 2026; Vic DH Responding to hoarding and squalor 2013',
      'AS1/stop': 'stop-work-keep | S500:2021 8.7; S520 9; WHS Regs 2011 r446, r458 (Vic has its own regs); SWA Code: How to safely remove asbestos (10 m2 rule; not ACT)',
      'AS1/test': 'test-suspect-materials | S700 5.2.1; S520 7.3',
      'AS2/lift': 'test-tiles-adhesive | S500:2021 8.7; S700 5.2.1',
      'AS2/positive': 'dry-without-disturbing | S500:2021 8.7',
      'SW1/carpet': 'remove-both-then | S500:2021 16.3.7, 16.2.2.2',
      'SW1/air': 'negative-pressure-slow | S500:2021 12.3, 12.3.5',
      'SW2/air': 'negative-pressure-slow | S500:2021 12.3, 12.3.5',
      'SW2/debris': 'double-bag | S500:2021 12.3',
      'SW3/source': 'stop-source-licensed | S500:2021 12.2.5, 1.2.3, 1.2.5',
      'SW3/ppe': 'respirator-eye-protection | S500:2021 8.4, 8.13',
      'ST1/power': 'power-stays-off | S500:2021 16.3.15, 12.2.4',
      'ST1/wallboard': 'remove-dry-frame | S500:2021 16.2.2.2, 16.2.1',
      'ST4/power': 'power-stays-off | S500:2021 16.3.15, 12.2.4',
      'ST4/carpet': 'remove-both-then | S500:2021 16.3.7',
    }
    const got: Record<string, string> = {}
    for (const [id, list] of Object.entries(DECISIONS)) for (const x of list ?? []) got[`${id}/${x.id}`] = `${x.right} | ${x.source}`
    expect(got).toEqual(key)
  })

  it('A3 a job shows the next decision\'s prompt and options, and no answer until it is called', () => {
    const job = w1Called().job
    // UNI-3457: one decision at a time, in order; the next appears when this one is called.
    expect(job?.decisions.map(x => x.id)).toEqual(['carpet'])
    expect(job?.decisions.every(x => x.call === null)).toBe(true)
    expect(job?.keyDecisions).toBeNull()
    const text = JSON.stringify(job?.decisions)
    for (const answer of ['"right"', 'rightOptionId', '"why"', '"source"', 'S500']) expect(text).not.toContain(answer)
  })

  it('A3 a call is judged right or wrong with the reason and the source, and each decision is called once', () => {
    const state = w1Called()
    const wrong = send(state, { type: 'call-decision', decisionId: 'carpet', optionId: 'discard-both' })
    const call = wrong.job?.decisions.find(x => x.id === 'carpet')?.call
    expect(call).toMatchObject({ optionId: 'discard-both', rightOptionId: 'dry-in-place', correct: false })
    expect(call?.why).toContain('The right call: Lift, dry and relay them.')
    expect(call?.source).toBe('S500:2021 16.3.7; Appendix C (informative)')
    expect(code(wrong, { type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' })).toBe('decision-already-called')
    expect(wrong.job?.decisions.map(x => x.id)).toEqual(['carpet', 'air-movers'])
    const right = send(wrong, { type: 'call-decision', decisionId: 'air-movers', optionId: 'three-four' })
    expect(right.job?.decisions.find(x => x.id === 'air-movers')?.call?.correct).toBe(true)
  })

  it('A3 decisions come after the stops and the water call, and the job finishes only when all are called', () => {
    let state = send(withBusiness(), { type: 'start-job', scenarioId: 'W1', houseType: 'T1' })
    expect(code(state, { type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' })).toBe('stops-not-called')
    state = send(state, { type: 'call-stops', stops: ['ELEC', 'TRADE'] })
    expect(code(state, { type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' })).toBe('water-not-called')
    state = send(state, { type: 'call-water', category: 1, waterClass: 2 })
    expect(code(state, { type: 'finish-job' })).toBe('decisions-open')
    // UNI-3457: the second decision is not shown yet, so calling it is refused.
    expect(code(state, { type: 'call-decision', decisionId: 'air-movers', optionId: 'one' })).toBe('invalid-command')
    state = send(state, { type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place' })
    expect(code(state, { type: 'finish-job' })).toBe('decisions-open')
    state = send(state, { type: 'call-decision', decisionId: 'air-movers', optionId: 'one' })
    const done = send(state, { type: 'finish-job' }).job
    expect(done?.stage).toBe('complete')
    expect(done?.keyDecisions).toBe(scenarioById('W1')?.keyDecisions)
  })

  it('UNI-3457 no on-site job names a Category or Class before the water call, or keyDecisions before the debrief', () => {
    for (const s of SCENARIOS) {
      if (!s.water) continue
      const state = send(withBusiness(), { type: 'start-job', scenarioId: s.id, houseType: s.houses[0] })
      const before = send(state, { type: 'call-stops', stops: [] }).job
      const text = JSON.stringify(before)
      expect(text, s.id).not.toMatch(/\b(cat|category|class)\s*[1-4]\b/i)
      expect(text, s.id).not.toContain(s.keyDecisions)
      expect(before?.decisions, s.id).toEqual([])
    }
  })

  it('UNI-3457 W3 is judged Category 2 once, by the water call, from the arrival evidence in its briefing', () => {
    const w3 = scenarioById('W3')!
    expect(w3.water?.categories).toEqual([2])
    const job = send(withBusiness(), { type: 'start-job', scenarioId: 'W3', houseType: 'T1' }).job
    expect(job?.briefing).toContain(`On arrival: ${w3.arrival}`)
    expect((DECISIONS.W3 ?? []).map(x => x.id)).toEqual(['hidden', 'cabinets'])
  })

  it('UNI-3457 the library refuses a second Category judgement, a disagreeing one, and time-decided water with no evidence', () => {
    const good = DECISIONS.W1![0]
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, prompt: 'Which Category is it?' }] })).toThrow('asks the Category again')
    // Codex round 1 probe: other wording, bare number options. Any unreviewed line that mentions the Category is refused.
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, prompt: 'What Category is the water?',
      options: [{ id: '1', label: '1' }, { id: '2', label: '2' }], right: '1' }] })).toThrow('asks the Category again')
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, prompt: 'Is this cat 2?' }] })).toThrow('asks the Category again')
    // A reviewed line changed by one word is no longer reviewed.
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, prompt: good.prompt.replace('What happens', 'Which Category, and what happens') }] })).toThrow('asks the Category again')
    // W1's "3 or 4" air movers mentions no Category and stays allowed.
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [DECISIONS.W1![1]] })).not.toThrow()
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, prompt: 'The water is Category 2. What now?' }] })).toThrow('names Category 2')
    expect(() => checkLibrary(HOUSE_TYPES, { W8: [{ ...good, why: 'Class 2 drying.' }] })).toThrow('names Class 2')
    // A wrong option may name a wrong Category; a job with no water call has no second judgement.
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, options: [...good.options, { id: 'x', label: 'Treat it as Category 3' }] }] })).toThrow('asks the Category again')
    expect(() => checkLibrary(HOUSE_TYPES, { F4: [{ ...good, prompt: 'Which Category?' }] })).not.toThrow()
  })

  it('A3 an unknown decision or option, another job\'s decision, or an extra key is an invalid command', () => {
    const state = w1Called()
    expect(code(state, { type: 'call-decision', decisionId: 'ceiling', optionId: 'remove' })).toBe('invalid-command')
    expect(code(state, { type: 'call-decision', decisionId: 'carpet', optionId: 'burn-it' })).toBe('invalid-command')
    expect(code(state, { type: 'call-decision', decisionId: 'carpet', optionId: 'dry-in-place', correct: true })).toBe('invalid-command')
    expect(code(state, { type: 'call-decision', decisionId: 'carpet' })).toBe('invalid-command')
  })

  it('A3 the library refuses a decision whose right option is not an option, one with no source, and an unknown scenario', () => {
    const good = DECISIONS.W1![0]
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, right: 'burn-it' }] })).toThrow('right option is not one of its options')
    expect(() => checkLibrary(HOUSE_TYPES, { W1: [{ ...good, source: ' ' }] })).toThrow('no reason or no source')
    expect(() => checkLibrary(HOUSE_TYPES, { W99: [good] })).toThrow('unknown scenario W99')
    expect(() => checkLibrary()).not.toThrow()
  })
})

describe('A2 house models', () => {
  const house = (id: HouseTypeId) => HOUSE_TYPES.find(h => h.id === id)!

  it('A2 every house has a model on the 2 m grid, with its storeys inside the catalogue range', () => {
    const range: Record<HouseTypeId, [number, number]> = {
      T1: [1, 2], T2: [1, 1], T3: [1, 1], T4: [1, 1], T5: [1, 2], T6: [2, 3], T7: [1, 2], T8: [1, 1], T9: [1, 1], T10: [8, 99],
    }
    for (const h of HOUSE_TYPES) {
      expect([h.id, h.model.widthM % 2, h.model.depthM % 2]).toEqual([h.id, 0, 0])
      expect(h.model.storeys).toBeGreaterThanOrEqual(range[h.id][0])
      expect(h.model.storeys).toBeLessThanOrEqual(range[h.id][1])
      expect(h.model.sources.length).toBeGreaterThan(0)
    }
  })

  it('A2 slab houses sit on the ground, raised houses stand above it, and the Queenslander is high set', () => {
    expect(HOUSE_TYPES.filter(h => h.model.floorHeightM === 0).map(h => h.id)).toEqual(['T1', 'T6', 'T10'])
    // House-styles S8: 1.5 to 1.8 m clear under the bearers, so the floor top is higher still.
    expect(house('T3').model.floorHeightM).toBeGreaterThan(1.8)
    for (const id of ['T2', 'T4', 'T5', 'T7', 'T8', 'T9'] as const) expect(house(id).model.floorHeightM).toBeGreaterThan(0)
  })

  it('A2 roofs: the tower is flat behind a parapet, the bungalow and terrace are gabled, the rest hipped', () => {
    expect(house('T10').model).toMatchObject({ roofForm: 'flat', roofPitchDeg: 0, parapet: true, storeys: 8 })
    expect(house('T7').model).toMatchObject({ roofForm: 'gable', attached: true, parapet: true })
    expect(house('T8').model.roofForm).toBe('gable')
    expect(HOUSE_TYPES.filter(h => h.model.roofForm === 'hip').map(h => h.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T9'])
    expect(HOUSE_TYPES.filter(h => h.model.attached).map(h => h.id)).toEqual(['T7'])
  })

  it('A2 the client receives each house model with the library', () => {
    const houses = withBusiness().homeBase?.library?.houses
    expect(houses?.find(h => h.id === 'T3')?.model).toEqual(house('T3').model)
    expect(houses?.every(h => typeof h.model?.widthM === 'number')).toBe(true)
  })

  it('A2 the library refuses a model off the 2 m grid or a roof whose pitch does not match its form', () => {
    const swap = (model: Partial<HouseModel>) => HOUSE_TYPES.map(h => (h.id === 'T1' ? { ...h, model: { ...h.model, ...model } } : h))
    expect(() => checkLibrary()).not.toThrow()
    expect(() => checkLibrary(swap({ widthM: 11 }))).toThrow('T1 footprint is off the 2 m grid')
    expect(() => checkLibrary(swap({ roofForm: 'flat' }))).toThrow('T1 roof pitch does not match its form')
    expect(() => checkLibrary(swap({ storeys: 0 }))).toThrow('T1 storeys must be a whole number from 1')
  })

  it('A2 a floor rule agrees with the model: slab-only scenarios use slab models, raised-only scenarios raised ones', () => {
    for (const x of SCENARIOS.filter(s => s.houseRule === 'Needs a concrete slab on the ground.')) {
      expect(x.houses.map(id => house(id).model.floorHeightM)).toEqual(x.houses.map(() => 0))
    }
    expect(SCENARIOS.find(x => x.id === 'W8')?.houses).not.toContain('T2')
    const set = (id: string, floorHeightM: number) => HOUSE_TYPES.map(h => (h.id === id ? { ...h, model: { ...h.model, floorHeightM } } : h))
    expect(() => checkLibrary(set('T1', 0.4))).toThrow('W8 needs a slab, but T1 is built raised')
    expect(() => checkLibrary(set('T3', 0))).toThrow(/needs a raised house, but T3 is built on a slab/)
  })
})
