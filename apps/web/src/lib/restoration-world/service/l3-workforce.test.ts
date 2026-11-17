// @vitest-environment node
// L3 workforce, roles and recruitment (founder approved 16/11/2026): the permission table, every L3 command and refusal,
// the restricted employment record, progression kept on a role change, frozen state and replay.
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { reduceWorld, replayWorld } from '../scenario'
import { startWorldServer, type RunningWorldServer } from './http-server'
import { PERMISSIONS, WorldService, type L3Action } from './world-service'

const OWNER = 'local-test-identity'
const RILEY = 'test-identity-riley-okafor'
const JORDAN = 'test-identity-jordan-pike'
const address = { line1: '12 Fictional Rd', suburb: 'Fortitude Valley', region: 'QLD', postcode: '4006', country: 'AU' }

function send(service: WorldService, actor: string, command: Record<string, unknown>) {
  return service.handle({ ...command, expectedRevision: service.current.revision }, actor)
}

/** Owner, Riley as senior technician, Jordan as administrator. */
function threePeople(): WorldService {
  const service = new WorldService('test')
  for (const [id, command] of [
    ['b', { type: 'create-business', name: 'Fictional Restorers', address }],
    ['p1', { type: 'add-person', personId: 'riley-okafor', roles: ['senior-technician'] }],
    ['p2', { type: 'add-person', personId: 'jordan-pike', roles: ['administrator'] }],
  ] as const) {
    const result = send(service, OWNER, { id, ...command })
    if (!result.ok) throw new Error(`${id} refused: ${result.code}`)
  }
  return service
}

const ALL_ACTIONS = Object.keys(PERMISSIONS) as L3Action[]

describe('L3 permission table', () => {
  it('is exactly the approved table', () => {
    expect(PERMISSIONS).toEqual({
      'add-person': ['owner'], 'change-roles': ['owner'], 'hire-candidate': ['owner'],
      'post-vacancy': ['owner', 'administrator'], 'read-people': ['owner', 'senior-technician', 'administrator'],
      'read-record-any': ['owner', 'administrator'], 'read-record-own': ['senior-technician'],
    })
    expect(Object.isFrozen(PERMISSIONS) && ALL_ACTIONS.every(a => Object.isFrozen(PERMISSIONS[a]))).toBe(true)
  })

  it('each identity is offered exactly the actions its roles allow', () => {
    const service = threePeople()
    const actions = (actor: string) => {
      const result = service.permissionsFor(actor)
      return result.ok ? [...result.actions].sort() : result.reason
    }
    expect(actions(OWNER)).toEqual(['add-person', 'change-roles', 'hire-candidate', 'post-vacancy', 'read-people', 'read-record-any'])
    expect(actions(RILEY)).toEqual(['read-people', 'read-record-own'])
    expect(actions(JORDAN)).toEqual(['post-vacancy', 'read-people', 'read-record-any'])
    // Not in the business yet: a test identity exists, but the person holds no role, so nothing is offered.
    expect(actions('test-identity-mia-tran')).toEqual([])
    expect(actions('nobody')).toBe('unknown-actor')
  })

  it('a second role adds that role\'s actions and read-record-any replaces read-record-own', () => {
    const service = threePeople()
    expect(send(service, OWNER, { id: 'r', type: 'change-roles', personId: 'riley-okafor', roles: ['administrator', 'senior-technician'] }).ok).toBe(true)
    const result = service.permissionsFor(RILEY)
    expect(result.ok && [...result.actions].sort()).toEqual(['post-vacancy', 'read-people', 'read-record-any'])
    expect(result.ok && result.roles).toEqual(['senior-technician', 'administrator'])
  })

  for (const command of [
    { type: 'add-person', personId: 'mia-tran', roles: ['administrator'] },
    { type: 'change-roles', personId: 'jordan-pike', roles: ['senior-technician'] },
    { type: 'hire-candidate', vacancyId: 'vacancy-4', candidateId: 'mia-tran' },
  ]) {
    for (const actor of [RILEY, JORDAN]) {
      it(`${command.type} from ${actor} is refused not-permitted, changes nothing and is audited`, () => {
        const service = threePeople()
        send(service, OWNER, { id: 'v', type: 'post-vacancy', role: 'senior-technician' })
        const before = service.current
        const events = service.events.length
        const result = send(service, actor, { id: 'x', ...command })
        expect(result).toMatchObject({ ok: false, code: 'permission-denied', reason: 'not-permitted' })
        expect(service.current).toBe(before)
        expect(service.events).toHaveLength(events)
        expect(service.audit).toEqual([{ seq: 1, actor, commandId: 'x', reason: 'not-permitted' }])
      })
    }
  }

  it('post-vacancy is refused to the senior technician and accepted from the administrator', () => {
    const service = threePeople()
    expect(send(service, RILEY, { id: 'v1', type: 'post-vacancy', role: 'administrator' })).toMatchObject({ reason: 'not-permitted' })
    expect(send(service, JORDAN, { id: 'v2', type: 'post-vacancy', role: 'administrator' }).ok).toBe(true)
  })

  it('a person not in the business holds no role, so a post-vacancy from their identity is refused', () => {
    const service = threePeople()
    expect(send(service, 'test-identity-mia-tran', { id: 'x', type: 'post-vacancy', role: 'administrator' }))
      .toMatchObject({ ok: false, reason: 'not-permitted' })
  })
})

describe('L3 commands', () => {
  it('ACC-3a: three people, each with one entry, the player first with no progression of their own', () => {
    const people = threePeople().current.business?.people
    expect(people?.map(p => [p.id, p.name, p.roles])).toEqual([
      ['player', 'You', ['owner']], ['riley-okafor', 'Riley Okafor', ['senior-technician']], ['jordan-pike', 'Jordan Pike', ['administrator']],
    ])
    expect(people?.[0].progression).toBeNull()
  })

  it('ACC-3b and RUL-3a: change-roles keeps one record, the id, the name and the progression field for field', () => {
    const service = threePeople()
    const before = service.current.business?.people.find(p => p.id === 'jordan-pike')
    expect(before?.progression?.hours).toBeGreaterThan(0)
    expect(send(service, OWNER, { id: 'r', type: 'change-roles', personId: 'jordan-pike', roles: ['administrator', 'senior-technician'] }).ok).toBe(true)
    const people = service.current.business?.people ?? []
    expect(people).toHaveLength(3)
    const after = people.find(p => p.id === 'jordan-pike')
    expect(after).toEqual({ ...before, roles: ['senior-technician', 'administrator'] })
  })

  it('ACC-3d: a vacancy lists the service\'s candidates; a hire adds the person with the vacancy\'s role and closes it', () => {
    const service = threePeople()
    expect(send(service, OWNER, { id: 'v', type: 'post-vacancy', role: 'senior-technician' }).ok).toBe(true)
    const vacancy = service.current.business?.vacancy
    expect(vacancy).toMatchObject({ id: 'vacancy-4', role: 'senior-technician', status: 'open', hiredId: null })
    expect(vacancy?.candidates.map(c => c.id)).toEqual(['mia-tran', 'leo-hart', 'ava-nolan'])
    expect(send(service, OWNER, { id: 'h', type: 'hire-candidate', vacancyId: 'vacancy-4', candidateId: 'leo-hart' }).ok).toBe(true)
    const business = service.current.business
    expect(business?.people).toHaveLength(4)
    expect(business?.people.at(-1)).toMatchObject({ id: 'leo-hart', name: 'Leo Hart', roles: ['senior-technician'] })
    expect(business?.vacancy).toMatchObject({ status: 'closed', hiredId: 'leo-hart' })
    // The hired person is not listed again on the next vacancy for the role.
    expect(send(service, OWNER, { id: 'v2', type: 'post-vacancy', role: 'senior-technician' }).ok).toBe(true)
    expect(service.current.business?.vacancy?.candidates.map(c => c.id)).toEqual(['mia-tran', 'ava-nolan'])
  })

  it('refusals: unknown person, added twice, the owner\'s own roles, a second open vacancy, a closed or wrong vacancy, an unlisted candidate', () => {
    const service = threePeople()
    const code = (command: Record<string, unknown>) => {
      const result = send(service, OWNER, { id: `c${service.attempts.length}`, ...command })
      return result.ok ? 'accepted' : result.code
    }
    expect(code({ type: 'add-person', personId: 'nobody', roles: ['administrator'] })).toBe('person-unknown')
    expect(code({ type: 'add-person', personId: 'riley-okafor', roles: ['administrator'] })).toBe('person-already-added')
    expect(code({ type: 'change-roles', personId: 'player', roles: ['administrator'] })).toBe('person-unknown')
    expect(code({ type: 'change-roles', personId: 'mia-tran', roles: ['administrator'] })).toBe('person-unknown')
    expect(code({ type: 'hire-candidate', vacancyId: 'vacancy-1', candidateId: 'mia-tran' })).toBe('vacancy-not-open')
    expect(code({ type: 'post-vacancy', role: 'senior-technician' })).toBe('accepted')
    const vacancyId = service.current.business?.vacancy?.id
    expect(code({ type: 'post-vacancy', role: 'administrator' })).toBe('vacancy-already-open')
    expect(code({ type: 'hire-candidate', vacancyId: 'vacancy-999', candidateId: 'mia-tran' })).toBe('vacancy-not-open')
    expect(code({ type: 'hire-candidate', vacancyId, candidateId: 'sam-ellis' })).toBe('person-unknown')
  })

  it('shape: owner not grantable, roles known and unique, no extra keys (made-up candidate details are invalid)', () => {
    const service = threePeople()
    const code = (command: Record<string, unknown>) => {
      const result = send(service, OWNER, { id: `s${service.attempts.length}`, ...command })
      return result.ok ? 'accepted' : result.code
    }
    for (const command of [
      { type: 'add-person', personId: 'mia-tran', roles: ['owner'] },
      { type: 'add-person', personId: 'mia-tran', roles: [] },
      { type: 'add-person', personId: 'mia-tran', roles: ['administrator', 'administrator'] },
      { type: 'add-person', personId: 'mia-tran', roles: 'administrator' },
      { type: 'add-person', personId: 'Mia Tran', roles: ['administrator'] },
      { type: 'add-person', personId: 'mia-tran', roles: ['administrator'], name: 'Mia' },
      { type: 'post-vacancy', role: 'owner' },
      { type: 'hire-candidate', vacancyId: 'vacancy-4', candidateId: 'mia-tran', name: 'Made Up' },
      { type: 'hire-candidate', vacancyId: 'vacancy-4', candidateId: 'mia-tran', summary: 'Made up' },
    ]) expect(code(command)).toBe('invalid-command')
  })

  it('L3 commands need a business', () => {
    const service = new WorldService('test')
    // No business: the owner holds no L3 role yet, so the service refuses before the reducer sees it.
    expect(send(service, OWNER, { id: 'a', type: 'post-vacancy', role: 'administrator' })).toMatchObject({ reason: 'not-permitted' })
    const world = service.current
    expect(reduceWorld(world, { id: 'a', expectedRevision: 0, type: 'post-vacancy', role: 'administrator' })).toMatchObject({ code: 'invalid-stage' })
  })

  it('state is frozen all the way down, and replaying the accepted log gives the same state', () => {
    const service = threePeople()
    send(service, OWNER, { id: 'v', type: 'post-vacancy', role: 'senior-technician' })
    send(service, OWNER, { id: 'h', type: 'hire-candidate', vacancyId: 'vacancy-4', candidateId: 'mia-tran' })
    const business = service.current.business
    const person = business?.people.at(-1)
    expect([business?.people, person, person?.roles, person?.progression, person?.progression?.stats,
      person?.progression?.credentials, business?.vacancy, business?.vacancy?.candidates, business?.vacancy?.candidates[0]]
      .every(x => Object.isFrozen(x))).toBe(true)
    const rebuilt = service.rebuild()
    expect(rebuilt.ok && rebuilt.state).toEqual(service.current)
  })

  it('a log longer than 256 accepted commands still rebuilds to the same state (review of 50facaa3, P1)', () => {
    const service = threePeople()
    const roleSets = [['administrator', 'senior-technician'], ['administrator']]
    for (let i = 0; i < 300; i++) {
      const result = send(service, OWNER, { id: `r${i}`, type: 'change-roles', personId: 'jordan-pike', roles: roleSets[i % 2] })
      if (!result.ok) throw new Error(`r${i} refused: ${result.code}`)
    }
    expect(service.events).toHaveLength(303)
    const rebuilt = service.rebuild()
    expect(rebuilt.ok).toBe(true)
    expect(rebuilt.state).toEqual(service.current)
    // The 256 bound still holds for a command list from outside the service.
    expect(replayWorld(service.events)).toMatchObject({ ok: false, code: 'invalid-command' })
  })
})

/** Every object reachable from a value, so a test can check each one is frozen. */
function objectsIn(value: unknown, out: object[] = []): object[] {
  if (value !== null && typeof value === 'object') {
    out.push(value)
    for (const child of Object.values(value)) objectsIn(child, out)
  }
  return out
}

describe('one owner for the freeze rule and one audit log (review of 42eae88e)', () => {
  it('every object in the state and the accepted log is frozen: L3 people, a library job, its decisions', () => {
    const l3 = threePeople()
    send(l3, OWNER, { id: 'v', type: 'post-vacancy', role: 'senior-technician' })
    send(l3, OWNER, { id: 'h', type: 'hire-candidate', vacancyId: 'vacancy-4', candidateId: 'mia-tran' })
    const job = new WorldService('test')
    expect(send(job, OWNER, { id: 'b', type: 'create-business', name: 'Fictional Restorers', address }).ok).toBe(true)
    expect(send(job, OWNER, { id: 's', type: 'start-job', scenarioId: 'W1', houseType: 'T1' }).ok).toBe(true)
    // UNI-3457: decisions show after the stops and the water call.
    expect(send(job, OWNER, { id: 'c', type: 'call-stops', stops: ['ELEC', 'TRADE'] }).ok).toBe(true)
    expect(send(job, OWNER, { id: 'w', type: 'call-water', category: 1, waterClass: 2 }).ok).toBe(true)
    expect(job.current.job?.decisions.length).toBeGreaterThan(0)
    for (const service of [l3, job]) {
      // service.events is a fresh copy of the log array; the events inside it are the stored ones.
      const objects = [service.current, ...service.events].flatMap(value => objectsIn(value))
      expect(objects.length).toBeGreaterThan(20)
      expect(objects.filter(o => !Object.isFrozen(o))).toEqual([])
    }
    // Codex's reproduction: removing a decision from current state without an event must be impossible.
    const decisions = job.current.job?.decisions as unknown as unknown[]
    expect(() => decisions.splice(0, decisions.length)).toThrow(TypeError)
    const rebuilt = job.rebuild()
    expect(rebuilt.ok && rebuilt.state).toEqual(job.current)
  })

  it('a refused fixture command is audited in the one audit log, and the fixture changes nothing', () => {
    const service = threePeople()
    const before = service.current
    const events = service.events
    const result = service.testLoadFixture([{ id: 'x', expectedRevision: 0, type: 'post-vacancy', role: 'administrator' }])
    expect(result).toMatchObject({ ok: false, code: 'permission-denied', reason: 'not-permitted' })
    expect(service.audit).toEqual([{ seq: 1, actor: OWNER, commandId: 'x', reason: 'not-permitted' }])
    expect(service.current).toBe(before)
    expect(service.events).toEqual(events)
  })

  it('the service never makes a second service, so there is only ever one audit log', () => {
    const source = readFileSync(new URL('./world-service.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/new WorldService\(/)
    expect(source.match(/private readonly auditLog/g)).toHaveLength(1)
  })
})

describe('L3 over HTTP', () => {
  let running: RunningWorldServer | undefined
  afterEach(async () => {
    await running?.close()
    running = undefined
  })

  it('GET /permissions from an unknown actor is 403 and appears in the audit evidence', async () => {
    running = await startWorldServer({ mode: 'test' })
    const response = await fetch(`${running.url}/permissions`, { headers: { 'x-rw-actor': 'nobody' } })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ ok: false, code: 'permission-denied', reason: 'unknown-actor' })
    const evidence = await (await fetch(`${running.url}/test/evidence`)).json()
    expect(evidence.audit).toEqual([{ seq: 1, actor: 'nobody', commandId: null, reason: 'unknown-actor' }])
    expect(evidence.events).toEqual([])
  })

  it('POST /test/fixture with a refused command is 403 and its refusal is in the audit evidence', async () => {
    running = await startWorldServer({ mode: 'test' })
    const response = await fetch(`${running.url}/test/fixture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ commands: [{ id: 'x', expectedRevision: 0, type: 'post-vacancy', role: 'administrator' }] }),
    })
    expect(response.status).toBe(403)
    const evidence = await (await fetch(`${running.url}/test/evidence`)).json()
    expect(evidence.audit).toEqual([{ seq: 1, actor: OWNER, commandId: 'x', reason: 'not-permitted' }])
    expect(evidence.events).toEqual([])
  })
})

describe('L3 restricted employment record', () => {
  it('owner and administrator read any record; the senior technician reads only their own', () => {
    const service = threePeople()
    expect(service.readRecord(OWNER, 'jordan-pike')).toEqual({ ok: true, record: {
      personId: 'jordan-pike', name: 'Jordan Pike', roles: ['administrator'], startDate: '14/07/2024', payLevel: 'Level 3 (fictional)' } })
    expect(service.readRecord(JORDAN, 'riley-okafor')).toMatchObject({ ok: true, record: { personId: 'riley-okafor' } })
    expect(service.readRecord(JORDAN, 'player')).toMatchObject({ ok: true, record: { payLevel: 'Owner: no pay level' } })
    expect(service.readRecord(RILEY, 'riley-okafor')).toMatchObject({ ok: true, record: { personId: 'riley-okafor' } })
    expect(service.audit).toEqual([])
  })

  it('NEG-3b: a refused read returns no part of the record and is audited with the person asked for', () => {
    const service = threePeople()
    const result = service.readRecord(RILEY, 'jordan-pike')
    expect(result).toEqual({ ok: false, code: 'permission-denied', reason: 'not-permitted' })
    expect(service.audit).toEqual([{ seq: 1, actor: RILEY, commandId: null, reason: 'not-permitted', target: 'jordan-pike' }])
    expect(service.readRecord('nobody', 'jordan-pike')).toEqual({ ok: false, code: 'permission-denied', reason: 'unknown-actor' })
    expect(service.audit.at(-1)).toMatchObject({ actor: 'nobody', reason: 'unknown-actor', target: 'jordan-pike' })
  })

  it('a senior technician cannot learn whether a person exists; a reader of any record gets not-found', () => {
    const service = threePeople()
    expect(service.readRecord(RILEY, 'mia-tran')).toMatchObject({ reason: 'not-permitted' })
    expect(service.readRecord(OWNER, 'mia-tran')).toEqual({ ok: false, code: 'not-found' })
  })

  it('a refused permissions read is audited once, like every other refusal (review of 50facaa3, P1)', () => {
    const service = threePeople()
    const before = service.current
    expect(service.permissionsFor('nobody')).toEqual({ ok: false, code: 'permission-denied', reason: 'unknown-actor' })
    expect(service.permissionsFor(undefined)).toMatchObject({ reason: 'unknown-actor' })
    expect(service.audit).toEqual([
      { seq: 1, actor: 'nobody', commandId: null, reason: 'unknown-actor' },
      { seq: 2, actor: null, commandId: null, reason: 'unknown-actor' },
    ])
    expect(service.current).toBe(before)
    // An allowed read writes nothing.
    expect(service.permissionsFor(RILEY).ok).toBe(true)
    expect(service.audit).toHaveLength(2)
  })

  it('every permission refusal, of every kind, adds exactly one audit entry', () => {
    const service = threePeople()
    const refusals: Array<() => { ok: boolean }> = [
      () => send(service, 'nobody', { id: 'u', type: 'post-vacancy', role: 'administrator' }),
      () => send(service, RILEY, { id: 'n', type: 'post-vacancy', role: 'administrator' }),
      () => service.permissionsFor('nobody'),
      () => service.readRecord('nobody', 'jordan-pike'),
      () => service.readRecord(RILEY, 'jordan-pike'),
    ]
    refusals.forEach((refuse, i) => {
      expect(refuse()).toMatchObject({ ok: false, code: 'permission-denied' })
      expect(service.audit).toHaveLength(i + 1)
    })
  })

  it('the service builds a permission refusal in one place only, so no path can skip the audit', () => {
    const source = readFileSync(new URL('./world-service.ts', import.meta.url), 'utf8')
    // A refusal value is written `code: 'permission-denied',`; type declarations use `;` and are not counted.
    const values = [...source.matchAll(/code: 'permission-denied',/g)].map(m => m.index)
    expect(values).toHaveLength(1)
    const refuse = source.indexOf('  private refuse<')
    const refuseEnd = source.indexOf('\n  }\n', refuse)
    expect(refuse).toBeGreaterThan(-1)
    expect(values[0]).toBeGreaterThan(refuse)
    expect(values[0]).toBeLessThan(refuseEnd)
  })

  it('no employment field is in the world state the client reads', () => {
    const service = threePeople()
    const text = JSON.stringify(service.current)
    expect(text).not.toContain('payLevel')
    expect(text).not.toContain('startDate')
    expect(text).not.toContain('Level 3 (fictional)')
  })
})
