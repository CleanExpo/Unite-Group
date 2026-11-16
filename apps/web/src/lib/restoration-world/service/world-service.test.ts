// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createWorld, reduceWorld, SCHEMA_VERSION, type WorldResult, type WorldState } from '../scenario'
import { startWorldServer, type RunningWorldServer } from './http-server'
import { LOCAL_TEST_IDENTITY, PrivilegedControlRefused, WorldService } from './world-service'

const decide = (id: string, expectedRevision: number, choice = 'seek-support') => ({ id, expectedRevision, type: 'decide', choice })
const reflect = (id: string, expectedRevision: number) => ({ id, expectedRevision, type: 'reflect' })
const complete = (id: string, expectedRevision: number) => ({ id, expectedRevision, type: 'complete' })
const ME = LOCAL_TEST_IDENTITY.id
const business = (id: string, expectedRevision: number) => ({ id, expectedRevision, type: 'create-business', name: 'Fictional Restorers',
  address: { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' } })
const enterClaim = (id: string, expectedRevision: number) => ({ id, expectedRevision, type: 'enter-claim' })
const decideClaim = (id: string, expectedRevision: number, optionId = 'dry-in-place') => ({ id, expectedRevision, type: 'decide-claim', optionId })
const completeClaim = (id: string, expectedRevision: number) => ({ id, expectedRevision, type: 'complete-claim' })

/** Command sequences covering accept, idempotent replay, id conflict, stale revision, wrong stage and bad input. */
const SEQUENCES: Record<string, unknown[]> = {
  happyPathSupport: [decide('a', 0), reflect('b', 1), complete('c', 2)],
  happyPathRush: [decide('a', 0, 'rush-response'), reflect('b', 1), complete('c', 2)],
  staleRevision: [decide('a', 0), reflect('b', 0), reflect('b2', 1)],
  staleAfterProgress: [decide('a', 0), reflect('b', 1), complete('c', 1), complete('c2', 2)],
  futureRevision: [decide('a', 5), decide('a2', 0)],
  idempotentReplay: [decide('a', 0), decide('a', 0), reflect('b', 1)],
  idConflict: [decide('a', 0), decide('a', 0, 'rush-response'), reflect('a', 1)],
  wrongStage: [reflect('a', 0), complete('b', 0), decide('c', 0)],
  decideTwice: [decide('a', 0), decide('b', 1)],
  clientSuppliedEffect: [{ ...decide('a', 0), availableCapacity: 100 }, decide('a2', 0)],
  clientSuppliedState: [{ id: 'x', expectedRevision: 0, type: 'decide', choice: 'seek-support', state: { stage: 'complete' } }],
  claimPath: [business('b', 0), enterClaim('e', 1), decideClaim('d', 2), completeClaim('f', 3)],
  claimForgedEffects: [business('b', 0), enterClaim('e', 1),
    { ...decideClaim('d', 2), effects: { dryingTimeHours: 1, costAud: 0, clientSatisfaction: 99, reputation: 99 } },
    decideClaim('d2', 2, 'power-on-shortcut'), completeClaim('f', 3)],
  claimOutOfOrder: [enterClaim('e', 0), business('b', 0), completeClaim('f', 1), decideClaim('d', 1), enterClaim('e2', 1), enterClaim('e3', 2)],
  badInputs: [null, 7, 'decide', [], { id: '', expectedRevision: 0, type: 'reflect' }, { id: 'ok', expectedRevision: -1, type: 'reflect' }, { id: 'ok', expectedRevision: 0, type: 'teleport' }],
}

function directRun(commands: unknown[]): WorldResult[] {
  let state: WorldState = createWorld()
  return commands.map(command => {
    const result = reduceWorld(state, command)
    if (result.ok) state = result.state
    return result
  })
}

describe('WorldService command-sequence parity with reduceWorld', () => {
  for (const [name, commands] of Object.entries(SEQUENCES)) {
    it(`${name}: every result matches the reducer, and rebuild equals live state`, () => {
      const expected = directRun(commands)
      const service = new WorldService('live')
      commands.forEach((command, index) => {
        const actual = service.handle(command, ME)
        expect(actual).toEqual(expected[index])
        const rebuilt = service.rebuild()
        expect(rebuilt.ok).toBe(true)
        expect(rebuilt.state).toEqual(service.current)
      })
    })
  }

  it('the event log holds only accepted, non-replayed commands', () => {
    const service = new WorldService('live')
    for (const command of SEQUENCES.idempotentReplay) service.handle(command, ME)
    expect(service.events).toEqual([decide('a', 0), reflect('b', 1)])
  })

  it('a client-supplied effect value is rejected and changes nothing (NEG-2a shape)', () => {
    const service = new WorldService('live')
    const before = service.current
    const result = service.handle({ ...decide('a', 0), availableCapacity: 100 }, ME)
    expect(result).toMatchObject({ ok: false, code: 'invalid-command' })
    expect(service.current).toBe(before)
  })
})

describe('permission checks (service-owned) with audit on denial', () => {
  it('a missing or unknown actor is denied, audited, and changes nothing', () => {
    const service = new WorldService('live')
    const before = service.current
    for (const actor of [null, undefined, '', 'someone-else', 42]) {
      expect(service.handle(decide('a', 0), actor)).toMatchObject({ ok: false, code: 'permission-denied', reason: 'unknown-actor' })
    }
    expect(service.current).toBe(before)
    expect(service.events).toEqual([])
    expect(service.audit.map(e => e.reason)).toEqual(Array(5).fill('unknown-actor'))
    expect(service.audit[3]).toEqual({ seq: 4, actor: 'someone-else', commandId: 'a', reason: 'unknown-actor' })
  })

  it('an identity without the scenario role is denied and audited (NEG-3a shape)', () => {
    const service = new WorldService('live', [LOCAL_TEST_IDENTITY, { id: 'fixture-owner-only', roles: ['owner'] }])
    expect(service.handle(decide('a', 0), 'fixture-owner-only')).toMatchObject({ ok: false, code: 'permission-denied', reason: 'missing-role' })
    expect(service.current.revision).toBe(0)
    expect(service.audit).toEqual([{ seq: 1, actor: 'fixture-owner-only', commandId: 'a', reason: 'missing-role' }])
    expect(service.handle(decide('a', 0), LOCAL_TEST_IDENTITY.id)).toMatchObject({ ok: true })
  })

  it('permission is checked before the reducer: a denied command cannot claim an id', () => {
    const service = new WorldService('live')
    service.handle(decide('a', 0, 'rush-response'), 'intruder')
    expect(service.handle(decide('a', 0), LOCAL_TEST_IDENTITY.id)).toMatchObject({ ok: true, replayed: false })
  })

  it('L1: create-business needs the owner role; a technician-only identity is denied and audited, the owner is accepted', () => {
    const technician = { id: 'fixture-technician-only', roles: ['technician'] }
    const service = new WorldService('live', [LOCAL_TEST_IDENTITY, technician])
    const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }
    const create = { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers', address }
    expect(service.handle(create, technician.id)).toMatchObject({ ok: false, code: 'permission-denied', reason: 'missing-role' })
    expect(service.audit).toEqual([{ seq: 1, actor: technician.id, commandId: 'b', reason: 'missing-role' }])
    expect(service.current.business).toBeNull()
    expect(service.handle(create, ME)).toMatchObject({ ok: true })
    expect(service.current.business?.currency).toBe('AUD')
    // The technician role still governs the scenario commands, for both identities.
    expect(service.handle(decide('a', 1), technician.id)).toMatchObject({ ok: true })
  })

  it('L2: the claim commands need the technician role; an owner-only identity is denied and audited, the technician is accepted', () => {
    const service = new WorldService('test', [{ id: 'owner-only', roles: ['owner'] }, { id: 'tech', roles: ['technician'] }])
    expect(service.handle(business('b', 0), 'owner-only').ok).toBe(true)
    const denied = service.handle(enterClaim('e', 1), 'owner-only')
    expect(denied).toMatchObject({ ok: false, code: 'permission-denied', reason: 'missing-role' })
    expect(service.audit.at(-1)).toMatchObject({ actor: 'owner-only', commandId: 'e', reason: 'missing-role' })
    expect(service.current.claim).toBeNull()
    expect(service.handle(enterClaim('e', 1), 'tech').ok).toBe(true)
    expect(service.current.claim?.stage).toBe('on-site')
  })

  it('L2 NEG-2a: a decide-claim carrying effects is logged as a 400 attempt, commits nothing, and rebuild equals current', () => {
    const service = new WorldService('test')
    for (const command of [business('b', 0), enterClaim('e', 1)]) expect(service.handle(command, ME).ok).toBe(true)
    const before = service.current
    const forged = { ...decideClaim('d', 2), effects: { dryingTimeHours: 1, costAud: 0, clientSatisfaction: 99, reputation: 99 } }
    expect(service.handle(forged, ME)).toEqual({ ok: false, code: 'invalid-command', state: before })
    expect(service.attempts.at(-1)).toMatchObject({ outcome: 'rejected', code: 'invalid-command', status: 400, input: forged })
    expect(service.current).toBe(before)
    for (const command of [decideClaim('d', 2), completeClaim('f', 3)]) expect(service.handle(command, ME).ok).toBe(true)
    expect(service.current.business?.stats.reputation).toBe(6)
    const rebuilt = service.rebuild()
    expect(rebuilt.ok && JSON.stringify(rebuilt.state)).toBe(JSON.stringify(service.current))
  })

  it('L1 NEG-1: a refused address is logged as an attempt with its reason, status 400, and changes nothing', () => {
    const service = new WorldService('test')
    const abroad = { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers',
      address: { line1: '1 Example St', suburb: 'Springfield', region: 'OR', postcode: '97477', country: 'US' } }
    expect(service.handle(abroad, ME)).toEqual({ ok: false, code: 'invalid-address', reason: 'country-outside-au-nz', state: service.current })
    expect(service.attempts.map(a => [a.outcome, a.code, a.reason, a.status])).toEqual([['rejected', 'invalid-address', 'country-outside-au-nz', 400]])
    expect(service.events).toEqual([])
    expect(service.rebuild().state).toEqual(service.current)
  })

  it('an accepted event read back through service.events cannot be changed, and rebuild still equals current (review L1 round 2, note 10)', () => {
    const service = new WorldService('test')
    const create = { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers',
      address: { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' } }
    expect(service.handle(create, ME)).toMatchObject({ ok: true })
    const event = service.events[0] as { address: { region: string } }
    expect(() => { event.address.region = 'NSW' }).toThrow(TypeError)
    expect(service.rebuild().state).toEqual(service.current)
    expect(service.current.business?.address.region).toBe('QLD')
  })

  it('an attempt read back through service.attempts cannot be changed, neither its input nor its state (review L1 round 3, note 13)', () => {
    const service = new WorldService('test')
    const create = { id: 'b', expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers',
      address: { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' } }
    expect(service.handle(create, ME)).toMatchObject({ ok: true })
    const attempt = service.attempts[0] as { input: { address: { region: string } }; state: { business: { address: { region: string } } } }
    expect(() => { attempt.input.address.region = 'NSW' }).toThrow(TypeError)
    expect(() => { attempt.state.business.address.region = 'NSW' }).toThrow(TypeError)
    expect(service.attempts[0].state.business?.address.region).toBe('QLD')
  })

  it('L1 NEG-1: an inherited object-property name is not an Australian region: refused, logged, nothing committed (review L1 round 1, finding 1)', () => {
    const service = new WorldService('test')
    for (const [i, region] of ['toString', 'constructor', '__proto__', 'valueOf'].entries()) {
      const command = { id: `b${i}`, expectedRevision: 0, type: 'create-business', name: 'Fictional Restorers',
        address: { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region, postcode: '4006', country: 'AU' } }
      expect(service.handle(command, ME)).toEqual({ ok: false, code: 'invalid-address', reason: 'region-unknown', state: service.current })
    }
    expect(service.current.revision).toBe(0)
    expect(service.current.business).toBeNull()
    expect(service.events).toEqual([])
    expect(service.attempts.map(a => [a.outcome, a.code, a.reason, a.status])).toEqual(Array(4).fill(['rejected', 'invalid-address', 'region-unknown', 400]))
  })
})

describe('privileged controls', () => {
  it('live service refuses every privileged control', () => {
    const service = new WorldService('live')
    expect(() => service.testReset()).toThrow(PrivilegedControlRefused)
    expect(() => service.testLoadFixture([])).toThrow(PrivilegedControlRefused)
    expect(() => service.testGoto('complete')).toThrow(PrivilegedControlRefused)
  })

  it('goto reaches each stage only through ordinary commands', () => {
    const service = new WorldService('test')
    for (const stage of ['briefing', 'consequence', 'reflected', 'complete'] as const) {
      const result = service.testGoto(stage)
      expect(result.ok).toBe(true)
      expect(service.current.stage).toBe(stage)
      expect(service.rebuild().state).toEqual(service.current)
      expect(service.current.professionalEvidence).toBe('not-assessed')
    }
  })

  it('a fixture containing an invalid or stale command is refused whole and leaves state unchanged', () => {
    const service = new WorldService('test')
    service.testGoto('consequence')
    const before = service.current
    expect(service.testLoadFixture([decide('a', 0), reflect('b', 0)])).toMatchObject({ ok: false, code: 'stale-revision' })
    expect(service.testLoadFixture([decide('a', 0), { id: 'b', expectedRevision: 1, type: 'reflect', stage: 'complete' }]))
      .toMatchObject({ ok: false, code: 'invalid-command' })
    expect(service.current).toBe(before)
  })

  it('normal commands in the test service still pass revision and stage checks', () => {
    const service = new WorldService('test')
    service.testGoto('reflected')
    expect(service.handle(complete('late', 0), ME)).toMatchObject({ ok: false, code: 'stale-revision' })
    expect(service.handle(reflect('again', 2), ME)).toMatchObject({ ok: false, code: 'invalid-stage' })
    expect(service.handle(complete('done', 2), ME)).toMatchObject({ ok: true })
  })

  it('unknown goto targets are refused', () => {
    const service = new WorldService('test')
    expect(service.testGoto('nowhere')).toMatchObject({ ok: false, code: 'invalid-command' })
    expect(service.testGoto('__proto__')).toMatchObject({ ok: false, code: 'invalid-command' })
  })
})

describe('attempt log (every attempt, accepted or rejected)', () => {
  it('records accepted, replayed and every kind of rejected attempt, in order, with actor, outcome, status and state after', () => {
    const service = new WorldService('test', [LOCAL_TEST_IDENTITY, { id: 'fixture-owner-only', roles: ['owner'] }])
    service.testReset()
    service.handle(decide('a', 0), 'intruder') //                      permission-denied / unknown-actor
    service.handle(decide('a', 0), 'fixture-owner-only') //            permission-denied / missing-role
    service.handle({ ...decide('a', 0), availableCapacity: 1 }, ME) // invalid-command
    service.handle(complete('b', 0), ME) //                            invalid-stage
    service.handle(decide('a', 0), ME) //                              accepted
    service.handle(decide('a', 0), ME) //                              replayed
    service.handle(reflect('c', 0), ME) //                             stale-revision
    service.handle(reflect('a', 1), ME) //                             id-conflict
    const attempts = service.attempts
    expect(attempts.map(a => a.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(attempts.map(a => [a.kind, a.outcome, a.code, a.reason, a.status])).toEqual([
      ['control', 'accepted', null, null, 200],
      ['command', 'rejected', 'permission-denied', 'unknown-actor', 403],
      ['command', 'rejected', 'permission-denied', 'missing-role', 403],
      ['command', 'rejected', 'invalid-command', null, 400],
      ['command', 'rejected', 'invalid-stage', null, 409],
      ['command', 'accepted', null, null, 200],
      ['command', 'replayed', null, null, 200],
      ['command', 'rejected', 'stale-revision', null, 409],
      ['command', 'rejected', 'id-conflict', null, 409],
    ])
    expect(attempts.map(a => a.actor)).toEqual([null, 'intruder', 'fixture-owner-only', ME, ME, ME, ME, ME, ME])
    expect(attempts[5].input).toEqual(decide('a', 0))
    expect(attempts[3].input).toEqual({ ...decide('a', 0), availableCapacity: 1 })
    // State after each attempt: unchanged by every rejection, advanced only by the accepted command.
    expect(attempts.slice(0, 5).every(a => a.state.revision === 0)).toBe(true)
    expect(attempts.slice(5).every(a => a.state.revision === 1)).toBe(true)
    expect(attempts[8].state).toEqual(service.current)
  })

  it('logs privileged controls, is append-only across reset, and hands out copies', () => {
    const service = new WorldService('test')
    service.testGoto('consequence')
    service.testGoto('nowhere')
    service.testLoadFixture([decide('a', 0), reflect('b', 0)])
    service.testReset()
    const attempts = service.attempts
    expect(attempts.map(a => [a.control, a.input, a.outcome, a.state.stage])).toEqual([
      ['goto', 'consequence', 'accepted', 'consequence'],
      ['goto', 'nowhere', 'rejected', 'consequence'],
      ['fixture', [decide('a', 0), reflect('b', 0)], 'rejected', 'consequence'],
      ['reset', null, 'accepted', 'briefing'],
    ])
    expect(attempts.map(a => a.seq)).toEqual([1, 2, 3, 4])
    ;(attempts as unknown as unknown[]).length = 0
    expect(service.attempts).toHaveLength(4)
  })

  it('a live service logs commands too, and refused controls leave no entry', () => {
    const service = new WorldService('live')
    service.handle(decide('a', 0), ME)
    expect(() => service.testReset()).toThrow(PrivilegedControlRefused)
    expect(service.attempts.map(a => a.kind)).toEqual(['command'])
  })
})

describe('HTTP transport', () => {
  let running: RunningWorldServer | undefined
  afterEach(async () => {
    await running?.close()
    running = undefined
  })

  const post = (path: string, body: unknown, actor: string | null = LOCAL_TEST_IDENTITY.id) =>
    fetch(`${running!.url}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(actor === null ? {} : { 'x-rw-actor': actor }) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })

  it('over HTTP, a missing or unknown actor gets 403 and is audited; evidence route is test-only', async () => {
    running = await startWorldServer({ mode: 'test' })
    expect((await post('/command', decide('a', 0), null)).status).toBe(403)
    const denied = await post('/command', decide('a', 0), 'intruder')
    expect(denied.status).toBe(403)
    expect(await denied.json()).toMatchObject({ ok: false, code: 'permission-denied', reason: 'unknown-actor' })
    expect(running.service.current.revision).toBe(0)
    const evidence = await (await fetch(`${running.url}/test/evidence`)).json()
    expect(evidence.audit.map((e: { actor: string | null }) => e.actor)).toEqual([null, 'intruder'])
    expect(evidence.events).toEqual([])
    await running.close()
    running = await startWorldServer({ mode: 'live' })
    expect((await fetch(`${running.url}/test/evidence`)).status).toBe(404)
  })

  it('refuses to bind anywhere but loopback', async () => {
    await expect(startWorldServer({ mode: 'test', host: '0.0.0.0' })).rejects.toThrow(/loopback/)
    await expect(startWorldServer({ mode: 'live', host: '0.0.0.0' })).rejects.toThrow(/loopback/)
  })

  it('command-sequence parity over HTTP for every sequence', async () => {
    for (const commands of Object.values(SEQUENCES)) {
      running = await startWorldServer({ mode: 'live' })
      const expected = directRun(commands)
      for (let i = 0; i < commands.length; i++) {
        const response = await post('/command', commands[i])
        const body = await response.json()
        expect(body).toEqual(JSON.parse(JSON.stringify(expected[i])))
        expect(response.status).toBe(expected[i].ok ? 200 : (expected[i] as { code: string }).code === 'invalid-command' ? 400 : 409)
      }
      const world = await (await fetch(`${running.url}/world`)).json()
      expect(world.state).toEqual(JSON.parse(JSON.stringify(running.service.current)))
      await running.close()
      running = undefined
    }
  })

  it('live mode does not mount /test routes', async () => {
    running = await startWorldServer({ mode: 'live' })
    for (const path of ['/test/reset', '/test/fixture', '/test/goto']) {
      const response = await post(path, { stage: 'complete', commands: [] })
      expect(response.status).toBe(404)
    }
    expect(running.service.current.stage).toBe('briefing')
    const health = await (await fetch(`${running.url}/health`)).json()
    expect(health.mode).toBe('live')
    expect(typeof health.schemaVersion).toBe('number')
    expect(health.schemaVersion).toBe(SCHEMA_VERSION)
    expect(health.schemaVersion).toBe(7)
  })

  it('/health reports the version of the state the service is serving', async () => {
    running = await startWorldServer({ mode: 'live' })
    const served = running.service.current
    Object.defineProperty(running.service, 'current', {
      // One more than the constant, so a /health that returns SCHEMA_VERSION fails here.
      get: () => ({ ...served, schemaVersion: SCHEMA_VERSION + 1 }) as unknown as WorldState,
    })
    const health = await (await fetch(`${running.url}/health`)).json()
    expect(health.schemaVersion).toBe(SCHEMA_VERSION + 1)
  })

  it('test mode exposes privileged controls that still go through the reducer', async () => {
    running = await startWorldServer({ mode: 'test' })
    expect((await post('/test/goto', { stage: 'reflected' })).status).toBe(200)
    expect(running.service.current.stage).toBe('reflected')
    const stale = await post('/test/fixture', { commands: [decide('a', 0), reflect('b', 0)] })
    expect(stale.status).toBe(409)
    expect(running.service.current.stage).toBe('reflected')
    expect((await post('/test/reset', {})).status).toBe(200)
    expect(running.service.current.stage).toBe('briefing')
    expect((await fetch(`${running.url}/test/reset`)).status).toBe(405)
  })

  it('rejects malformed and oversized bodies without changing state, and logs each attempt', async () => {
    running = await startWorldServer({ mode: 'live' })
    expect((await post('/command', '{not json')).status).toBe(400)
    expect((await post('/command', JSON.stringify({ pad: 'x'.repeat(20_000) }))).status).toBe(413)
    expect(running.service.current.revision).toBe(0)
    expect(running.service.attempts.map(a => [a.actor, a.input, a.outcome, a.code, a.status])).toEqual([
      [ME, null, 'rejected', 'invalid-command', 400],
      [ME, null, 'rejected', 'invalid-command', 413],
    ])
  })

  it('logs privileged controls whose body is malformed or oversized, and changes nothing (review P4 finding 1)', async () => {
    running = await startWorldServer({ mode: 'test' })
    await post('/test/goto', { stage: 'consequence' })
    for (const path of ['/test/reset', '/test/fixture', '/test/goto']) {
      expect((await post(path, '{not json')).status).toBe(400)
    }
    expect((await post('/test/goto', JSON.stringify({ stage: 'x'.repeat(20_000) }))).status).toBe(413)
    expect(running.service.current.stage).toBe('consequence')
    expect(running.service.attempts.map(a => [a.kind, a.control, a.input, a.outcome, a.code, a.status])).toEqual([
      ['control', 'goto', 'consequence', 'accepted', null, 200],
      ['control', 'reset', null, 'rejected', 'invalid-command', 400],
      ['control', 'fixture', null, 'rejected', 'invalid-command', 400],
      ['control', 'goto', null, 'rejected', 'invalid-command', 400],
      ['control', 'goto', null, 'rejected', 'invalid-command', 413],
    ])
    expect(() => new WorldService('live').recordControlTransportReject('reset', 400)).toThrow(PrivilegedControlRefused)
  })

  it('refuses a body holding a number JSON cannot carry (1e400 parses to Infinity), so no evidence is lost on the way out (review P7 finding 2)', async () => {
    running = await startWorldServer({ mode: 'test' })
    const overflow = '{"id":"o","expectedRevision":0,"type":"decide","choice":"seek-support","availableCapacity":1e400}'
    expect((await post('/command', overflow)).status).toBe(400)
    expect((await post('/test/goto', '{"stage":1e999}')).status).toBe(400)
    expect(running.service.current.revision).toBe(0)
    const evidence = await (await fetch(`${running.url}/test/evidence`)).json()
    expect(evidence.attempts.map((a: { kind: string; control: string | null; input: unknown; outcome: string; status: number }) =>
      [a.kind, a.control, a.input, a.outcome, a.status])).toEqual([
      ['command', null, null, 'rejected', 400],
      ['control', 'goto', null, 'rejected', 400],
    ])
    // The attempt log survives a JSON round trip unchanged: nothing in it was Infinity or NaN.
    expect(JSON.parse(JSON.stringify(running.service.attempts))).toEqual(running.service.attempts)
  })

  it('refuses integers beyond 2^53 and deeply nested bodies as logged attempts, never a 500 with no log (review P8 attempt)', async () => {
    running = await startWorldServer({ mode: 'test' })
    const body = (capacity: string) => `{"id":"o","expectedRevision":0,"type":"decide","choice":"seek-support","availableCapacity":${capacity}}`
    // Two different literals that parse to the same double must not both be accepted: the evidence could not tell them apart.
    expect((await post('/command', body('1000000000000000100'))).status).toBe(400)
    expect((await post('/command', body('1000000000000000128'))).status).toBe(400)
    expect((await post('/command', body('9007199254740993'))).status).toBe(400)
    for (const depth of [40, 1000, 5000]) {
      expect((await post('/command', body('['.repeat(depth) + '0' + ']'.repeat(depth)))).status).toBe(400)
    }
    expect((await post('/test/goto', `{"stage":${'['.repeat(3000)}0${']'.repeat(3000)}}`)).status).toBe(400)
    // Bytes that are not valid UTF-8 are refused, not logged as U+FFFD in place of what was sent.
    const badBytes = await fetch(`${running.url}/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-rw-actor': LOCAL_TEST_IDENTITY.id },
      body: new Uint8Array([0x7b, 0x22, 0x69, 0x64, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d]),
    })
    expect(badBytes.status).toBe(400)
    expect(running.service.current.revision).toBe(0)
    const attempts = running.service.attempts
    expect(attempts).toHaveLength(8)
    expect(attempts.every(a => a.outcome === 'rejected' && a.status === 400 && a.input === null)).toBe(true)
    // An ordinary flat command is still accepted: the limits do not touch it.
    expect((await post('/command', decide('ok', 0))).status).toBe(200)
  })

  it('refuses a number whose text the parsed value cannot return exactly (underflow, long decimals) and accepts exact ones (review P9 finding 2)', async () => {
    running = await startWorldServer({ mode: 'test' })
    const body = (id: string, n: string) => `{"id":"${id}","expectedRevision":0,"type":"decide","choice":"seek-support","availableCapacity":${n}}`
    const last = () => running!.service.attempts[running!.service.attempts.length - 1]
    // 1e-400 reads as 0 and 0.10000000000000001 as 0.1: the evidence would hold a different number than the one sent.
    // Negative zero in any spelling serialises as 0, so the evidence would say 0 where -0 was sent (gate review of 25b0536d).
    const lossy = ['1e-400', '-1e-400', '2.5e-324', '0.10000000000000001', '1.0000000000000001', '0.30000000000000004000001',
      '-0', '-0.0', '-0e5']
    for (const [i, n] of lossy.entries()) {
      expect((await post('/command', body(`l${i}`, n))).status, n).toBe(400)
      expect(last(), n).toMatchObject({ kind: 'command', input: null, outcome: 'rejected', status: 400 })
    }
    expect((await post('/command', '{"id":"z","expectedRevision":-0,"type":"decide","choice":"seek-support"}')).status).toBe(400)
    expect(last()).toMatchObject({ kind: 'command', input: null, outcome: 'rejected', status: 400 })
    expect(running.service.current.revision).toBe(0)
    // Numbers whose text is exactly their value still reach the service, spelled any way JSON allows.
    const exact = ['0', '0.0', '1.0', '0.1', '1e-300', '5e-324', '0.30000000000000004', '9007199254740991', '1E2', '1.5e+2']
    for (const [i, n] of exact.entries()) {
      await post('/command', body(`x${i}`, n))
      expect(last(), n).toMatchObject({ kind: 'command', input: { availableCapacity: Number(n) } })
    }
    // A member named twice would be logged with only its last value, so it is refused, however the name is spelled and
    // at any depth; the same name in two different objects is not a duplicate (gate review of 3183fad7).
    const duplicated = [
      '{"id":"first","id":"last","expectedRevision":0,"type":"decide","choice":"seek-support"}',
      '{"id":"d","expectedRevision":0,"type":"decide","choice":"seek-support","\\u0063hoice":"seek-support"}',
      '{"id":"d","expectedRevision":0,"type":"decide","choice":"seek-support","extra":{"a":1,"a":2}}',
      '{"id":"d","expectedRevision":0,"type":"decide","choice":"seek-support","extra":[{"a":1},{"b":[{"c":1,"c":1}]}]}',
    ]
    for (const raw of duplicated) {
      expect((await post('/command', raw)).status, raw).toBe(400)
      expect(last(), raw).toMatchObject({ kind: 'command', input: null, outcome: 'rejected', status: 400 })
    }
    await post('/command', '{"id":"n","expectedRevision":0,"type":"decide","choice":"seek-support","extra":[{"a":1},{"a":2}],"x":{"id":"n"}}')
    expect(last()).toMatchObject({ kind: 'command', input: { extra: [{ a: 1 }, { a: 2 }], x: { id: 'n' } } })
    // A number-shaped text inside a string is not a number: it is held as the text it is.
    const text = 'x 1e-400 \\" 0.10000000000000001'
    await post('/command', `{"id":"s","expectedRevision":0,"type":"decide","choice":"${text}"}`)
    expect(last()).toMatchObject({ kind: 'command', input: { choice: 'x 1e-400 " 0.10000000000000001' } })
  })

  it('the evidence route returns the attempt log, with the HTTP status of each attempt', async () => {
    running = await startWorldServer({ mode: 'test' })
    await post('/test/goto', { stage: 'briefing' })
    await post('/command', decide('a', 0), null)
    await post('/command', reflect('b', 0))
    await post('/command', decide('a', 0))
    const evidence = await (await fetch(`${running.url}/test/evidence`)).json()
    expect(evidence.attempts.map((a: { kind: string; actor: string | null; outcome: string; status: number }) => [a.kind, a.actor, a.outcome, a.status])).toEqual([
      ['control', null, 'accepted', 200],
      ['command', null, 'rejected', 403],
      ['command', ME, 'rejected', 409],
      ['command', ME, 'accepted', 200],
    ])
    expect(evidence.attempts[3].state).toEqual(evidence.state)
  })
})
