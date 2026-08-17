import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CONTRACT_SCHEMA_VERSION,
  ENVELOPE_LEDGER,
  REGISTERED_EVENT_TYPES,
  REGISTERED_STATE_MACHINES,
  RUN_STATES,
  findEnvelopeViolations,
  findIdentityChainGaps,
  findSecretShapes,
  isLegalTransition,
  redact,
} from '../../contracts/control-plane/v1.ts'
import {
  auditEnvelopeLedger,
  auditRegistry,
  auditTransitions,
  extractInterfaceBody,
  extractInterfaceExtends,
  listExportedTypeNames,
  parseStringUnion,
  resolveDeclaredFields,
  runAudit,
  stripComments,
} from '../control-plane-contract.mjs'

// A secret-SHAPED string, assembled at runtime so no credential-looking literal
// is ever committed to this file. Per the credential-custody rule: a fixture
// must prove the tripwire fires without carrying a real or realistic secret.
const fakeSecretShaped = ['sk', 'A'.repeat(40)].join('-')

// ─── Parser: does it read the executable declaration, and only that? ──────────

test('parseStringUnion reads single-line and multi-line unions', () => {
  assert.deepEqual(parseStringUnion("export type A = 'x' | 'y'\n", 'A'), ['x', 'y'])
  assert.deepEqual(
    parseStringUnion("export type B =\n  | 'p'\n  | 'q'\n\nexport type C = 'z'\n", 'B'),
    ['p', 'q'],
  )
})

test('parseStringUnion stops at the end of the declaration', () => {
  const source = "export type A = 'x'\nexport type B = 'y' | 'z'\n"
  assert.deepEqual(parseStringUnion(source, 'A'), ['x'])
})

test('parseStringUnion ignores members that only appear in comments', () => {
  const source = "// export type A = 'ghost'\nexport type A =\n  | 'real' // not 'ghost'\n"
  assert.deepEqual(parseStringUnion(source, 'A'), ['real'])
})

test('parseStringUnion keeps non-quoted union members out, and reports absence', () => {
  assert.deepEqual(parseStringUnion("export type A = null | 'x'\n", 'A'), ['x'])
  assert.equal(parseStringUnion("export type A = 'x'\n", 'Missing'), null)
})

test('stripComments removes line and block comments', () => {
  assert.equal(stripComments("| 'a' /* 'b' */ // 'c'").trim(), "| 'a'")
})

test('parseStringUnion reads a declaration whose `=` sits on the next line', () => {
  assert.deepEqual(parseStringUnion("export type A\n  = 'x' | 'y'\n", 'A'), ['x', 'y'])
})

test('parseStringUnion reads a generic declaration', () => {
  assert.deepEqual(parseStringUnion("export type A<T> = 'x' | 'y'\n", 'A'), ['x', 'y'])
})

test('the sweep sees a state machine whose `=` sits on the next line', () => {
  // Under-reporting here is a FALSE GREEN: a second state machine written this
  // way would pass the duplicate-control-system audit unseen.
  const sources = new Map([
    ['demo.ts', "export type Demo =\n  | 'queued'\n  | 'running'\n\nexport type SneakyStatus\n  = 'a' | 'b'\n"],
  ])
  const result = auditRegistry({ ...baseOpts, sources })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('SneakyStatus')), result.violations)
})

test('the sweep sees a generic state machine declaration', () => {
  const sources = new Map([
    ['demo.ts', "export type Demo =\n  | 'queued'\n  | 'running'\n\nexport type WrapStatus<T> = 'a' | 'b'\n"],
  ])
  const result = auditRegistry({ ...baseOpts, sources })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('WrapStatus')), result.violations)
})

test('listExportedTypeNames finds only top-level exported aliases', () => {
  const source = "export type A = 'x'\n  export type Indented = 'y'\nexport interface B { a: string }\n"
  assert.deepEqual(listExportedTypeNames(source), ['A'])
})

// ─── Registry audit: prove each check FIRES ──────────────────────────────────

const goodMachine = {
  id: 'demo',
  file: 'demo.ts',
  typeName: 'Demo',
  members: ['queued', 'running'],
  mapping: { queued: 'queued', running: 'running' },
}

const goodSources = new Map([['demo.ts', "export type Demo =\n  | 'queued'\n  | 'running'\n"]])

const baseOpts = {
  sources: goodSources,
  stateMachines: [goodMachine],
  eventTypes: [],
  controlPlaneSources: ['demo.ts'],
}

test('auditRegistry passes on an in-agreement registry (negative control)', () => {
  const result = auditRegistry(baseOpts)
  assert.deepEqual(result.violations, [])
  assert.equal(result.ok, true)
})

test('auditRegistry fires when source adds a member the contract does not map', () => {
  const sources = new Map([['demo.ts', "export type Demo =\n  | 'queued'\n  | 'running'\n  | 'paused'\n"]])
  const result = auditRegistry({ ...baseOpts, sources })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes("unmapped member(s) paused")), result.violations)
})

test('auditRegistry fires when the contract lists a member source has dropped', () => {
  const sources = new Map([['demo.ts', "export type Demo =\n  | 'queued'\n"]])
  const result = auditRegistry({ ...baseOpts, sources })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('source does not')), result.violations)
})

test('auditRegistry fires when the declaration is deleted outright', () => {
  const sources = new Map([['demo.ts', 'export interface Demo { a: string }\n']])
  const result = auditRegistry({ ...baseOpts, sources })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('no longer exists')), result.violations)
})

test('auditRegistry fires when a member maps to a state that is not canonical', () => {
  const machine = { ...goodMachine, mapping: { queued: 'queued', running: 'sprinting' } }
  const result = auditRegistry({ ...baseOpts, stateMachines: [machine] })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes("unknown run state 'sprinting'")), result.violations)
})

test('auditRegistry fires when a member is mapped to null without a stated reason', () => {
  const machine = { ...goodMachine, mapping: { queued: 'queued', running: null } }
  const result = auditRegistry({ ...baseOpts, stateMachines: [machine] })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('no stated reason')), result.violations)
})

test('auditRegistry accepts a null mapping that carries its reason', () => {
  const machine = {
    ...goodMachine,
    mapping: { queued: 'queued', running: null },
    offRunReasons: { running: 'demo: not a run state' },
  }
  assert.equal(auditRegistry({ ...baseOpts, stateMachines: [machine] }).ok, true)
})

test('auditRegistry fires when hand-copied declarations drift apart', () => {
  const sources = new Map([
    ['a.ts', "export type A =\n  | 'queued'\n"],
    ['b.ts', "export type B =\n  | 'running'\n"],
  ])
  const result = auditRegistry({
    sources,
    stateMachines: [
      { id: 'a', file: 'a.ts', typeName: 'A', members: ['queued'], mapping: { queued: 'queued' } },
      {
        id: 'b',
        file: 'b.ts',
        typeName: 'B',
        members: ['running'],
        mapping: { running: 'running' },
        duplicateOf: 'a',
      },
    ],
    eventTypes: [],
    controlPlaneSources: [],
  })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('drifted apart')), result.violations)
})

test('auditRegistry fires on an unregistered lifecycle union (duplicate-system audit)', () => {
  const sources = new Map([
    ['demo.ts', "export type Demo =\n  | 'queued'\n  | 'running'\n\nexport type ShadowStatus = 'a' | 'b'\n"],
  ])
  const result = auditRegistry({ ...baseOpts, sources })
  assert.equal(result.ok, false)
  assert.ok(
    result.violations.some((v) => v.includes('ShadowStatus') && v.includes('neither registered nor exempt')),
    result.violations,
  )
})

test('auditRegistry honours an explicit exemption for an unregistered union', () => {
  const sources = new Map([
    ['demo.ts', "export type Demo =\n  | 'queued'\n  | 'running'\n\nexport type ShadowStatus = 'a' | 'b'\n"],
  ])
  const result = auditRegistry({
    ...baseOpts,
    sources,
    exemptions: { 'demo.ts:ShadowStatus': 'demo exemption' },
  })
  assert.equal(result.ok, true)
})

test('auditRegistry fires when a registered file cannot be read', () => {
  const result = auditRegistry({ ...baseOpts, sources: new Map() })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('not readable')), result.violations)
})

// ─── Transition table ────────────────────────────────────────────────────────

test('auditTransitions passes on the shipped canonical table', () => {
  const result = auditTransitions()
  assert.deepEqual(result.violations, [])
})

test('auditTransitions fires on a terminal state with an escape hatch', () => {
  const result = auditTransitions({
    transitions: { queued: ['done'], done: ['queued'] },
    runStates: ['queued', 'done'],
    terminals: ['done'],
  })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('outgoing transitions')), result.violations)
})

test('auditTransitions fires on an unreachable state', () => {
  const result = auditTransitions({
    transitions: { queued: ['done'], done: [], orphan: [] },
    runStates: ['queued', 'done', 'orphan'],
    terminals: ['done'],
  })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('unreachable')), result.violations)
})

test('auditTransitions fires on a transition naming an unknown state', () => {
  const result = auditTransitions({
    transitions: { queued: ['nowhere'], done: [] },
    runStates: ['queued', 'done'],
    terminals: ['done'],
  })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('unknown state')), result.violations)
})

// ─── Envelope ledger ─────────────────────────────────────────────────────────

const ledgerSource = 'export interface E {\n  at: string\n  detail: string\n}\n'

const ledgerEntry = {
  id: 'demo-event',
  file: 'e.ts',
  interfaceName: 'E',
  fields: {
    schemaVersion: false,
    source: false,
    occurredAt: 'at',
    sequence: false,
    runId: false,
    kind: false,
    message: 'detail',
  },
  redactsMessages: false,
}

test('auditEnvelopeLedger passes when every claim matches source', () => {
  const result = auditEnvelopeLedger({
    sources: new Map([['e.ts', ledgerSource]]),
    ledger: [ledgerEntry],
  })
  assert.deepEqual(result.violations, [])
})

test('auditEnvelopeLedger fires when the ledger claims a field the source lacks', () => {
  const entry = { ...ledgerEntry, fields: { ...ledgerEntry.fields, source: 'actor' } }
  const result = auditEnvelopeLedger({
    sources: new Map([['e.ts', ledgerSource]]),
    ledger: [entry],
  })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('does not declare')), result.violations)
})

test('auditEnvelopeLedger fires when a required field has no ledger entry', () => {
  const fields = { ...ledgerEntry.fields }
  delete fields.sequence
  const result = auditEnvelopeLedger({
    sources: new Map([['e.ts', ledgerSource]]),
    ledger: [{ ...ledgerEntry, fields }],
  })
  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes("no ledger entry")), result.violations)
})

test('extractInterfaceBody returns null for a missing interface', () => {
  assert.equal(extractInterfaceBody(ledgerSource, 'Nope'), null)
})

// ─── Inherited envelope fields (UNI-2406 producer) ───────────────────────────
//
// A producer may satisfy the envelope by extending `RunEventEnvelope` instead
// of re-declaring its seven fields. That is the outcome this contract wants —
// an inherited field cannot drift from its base — so the audit has to see
// through `extends`, or it would reject the correct shape and reward the
// hand-copy. These tests hold that resolution to the same standard as the rest
// of the audit: it must credit a real inheritance, and must NOT credit an
// unresolvable one.

const baseSource = [
  'export interface BaseEnvelope {',
  '  schemaVersion: string',
  '  occurredAt: string',
  '}',
  '',
].join('\n')

const derivedSource = [
  'export interface DerivedEvent extends BaseEnvelope {',
  '  laneId: string',
  '}',
  '',
].join('\n')

const derivedLedgerEntry = {
  id: 'derived-event',
  file: 'derived.ts',
  interfaceName: 'DerivedEvent',
  fields: {
    schemaVersion: 'schemaVersion',
    source: false,
    occurredAt: 'occurredAt',
    sequence: false,
    runId: false,
    kind: false,
    message: false,
  },
  redactsMessages: true,
}

test('extractInterfaceExtends reads the base list off the declaration', () => {
  assert.deepEqual(extractInterfaceExtends(derivedSource, 'DerivedEvent'), ['BaseEnvelope'])
  assert.deepEqual(extractInterfaceExtends(ledgerSource, 'E'), [])
  assert.deepEqual(extractInterfaceExtends(derivedSource, 'Missing'), [])
})

test('resolveDeclaredFields unions a base interface from another file', () => {
  const sources = new Map([
    ['derived.ts', derivedSource],
    ['base.ts', baseSource],
  ])
  const resolved = resolveDeclaredFields(sources, 'derived.ts', 'DerivedEvent')
  assert.deepEqual([...resolved.fields].sort(), ['laneId', 'occurredAt', 'schemaVersion'])
  assert.deepEqual(resolved.missingBases, [])
})

test('resolveDeclaredFields keeps searching past an already-visited file', () => {
  // Regression: the cycle guard once returned an EMPTY SET, which reads as
  // "resolved, declares nothing" and ended the candidate search at the first
  // already-visited file. The ledger was then credited with zero inherited
  // fields and the audit reported a false violation. `derived.ts` is
  // deliberately first in iteration order so the guard is hit before the real
  // base is reached.
  const sources = new Map([
    ['derived.ts', derivedSource],
    ['base.ts', baseSource],
  ])
  const resolved = resolveDeclaredFields(sources, 'derived.ts', 'DerivedEvent')
  assert.ok(
    resolved.fields.has('schemaVersion'),
    'inherited fields must survive the cycle guard',
  )
})

test('resolveDeclaredFields reports a base it cannot resolve rather than assuming it', () => {
  const resolved = resolveDeclaredFields(
    new Map([['derived.ts', derivedSource]]),
    'derived.ts',
    'DerivedEvent',
  )
  assert.deepEqual(resolved.missingBases, ['BaseEnvelope'])
  assert.deepEqual([...resolved.fields], ['laneId'])
})

test('auditEnvelopeLedger credits an inherited field', () => {
  const result = auditEnvelopeLedger({
    sources: new Map([
      ['derived.ts', derivedSource],
      ['base.ts', baseSource],
    ]),
    ledger: [derivedLedgerEntry],
  })
  assert.deepEqual(result.violations, [])
})

test('auditEnvelopeLedger still fires when the base is out of scope', () => {
  // Positive control for the test above: same ledger entry, base file removed.
  // If this passed, the inheritance credit would be unconditional and the audit
  // would have stopped proving anything about inherited claims.
  const result = auditEnvelopeLedger({
    sources: new Map([['derived.ts', derivedSource]]),
    ledger: [derivedLedgerEntry],
  })
  assert.equal(result.ok, false)
  assert.ok(
    result.violations.some((v) => v.includes('cannot resolve in scope')),
    result.violations,
  )
  assert.ok(
    result.violations.some((v) => v.includes('does not declare')),
    result.violations,
  )
})

test('the shipped lane stream producer is registered and satisfies the envelope in full', async () => {
  const entry = ENVELOPE_LEDGER.find((row) => row.id === 'lane-stream-event')
  assert.ok(entry, 'the UNI-2406 producer must carry an envelope ledger entry')
  assert.equal(entry.file, 'apps/workspace/src/server/lanes/event-stream.ts')
  assert.equal(entry.redactsMessages, true)
  assert.ok(
    Object.values(entry.fields).every((claim) => claim !== false),
    'the lane stream event is the first shape to satisfy every envelope field',
  )
  const result = await runAudit()
  assert.equal(result.ok, true, JSON.stringify(result, null, 2))
  assert.ok(result.scope.includes(entry.file), result.scope)
})

// ─── Contract helpers ────────────────────────────────────────────────────────

test('findIdentityChainGaps fires when a link skips its parent', () => {
  assert.deepEqual(findIdentityChainGaps({ founderRequestId: 'f1', linearTaskId: 'UNI-1' }), [])
  const gaps = findIdentityChainGaps({ founderRequestId: 'f1', laneId: 'lane-1' })
  assert.ok(gaps.length > 0, 'a laneId with no operatorJobId must be a violation')
  assert.ok(gaps[0].includes('laneId is set but linearTaskId is missing'), gaps)
})

test('findIdentityChainGaps fires when the root itself is absent', () => {
  const gaps = findIdentityChainGaps({ linearTaskId: 'UNI-1' })
  assert.ok(gaps.some((g) => g.includes('founderRequestId is missing')), gaps)
})

test('isLegalTransition rejects terminal escapes and unknown states', () => {
  assert.equal(isLegalTransition('running', 'done'), true)
  assert.equal(isLegalTransition('done', 'running'), false)
  assert.equal(isLegalTransition('running', 'sprinting'), false)
})

test('findEnvelopeViolations reports every missing required field', () => {
  const violations = findEnvelopeViolations({})
  for (const field of ['schemaVersion', 'source', 'occurredAt', 'sequence', 'runId', 'kind', 'message']) {
    assert.ok(violations.includes(`${field} is missing`), `${field}: ${violations.join('; ')}`)
  }
})

test('findEnvelopeViolations accepts a compliant envelope', () => {
  const event = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    source: 'apps/workspace:lanes/cli-adapter',
    occurredAt: '2026-08-18T01:02:03.000Z',
    sequence: 1,
    runId: 'run-1',
    kind: 'lifecycle',
    fromState: 'claimed',
    toState: 'running',
    message: 'started',
  }
  assert.deepEqual(findEnvelopeViolations(event), [])
})

test('findEnvelopeViolations rejects an illegal state transition inside an event', () => {
  const violations = findEnvelopeViolations({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    source: 's',
    occurredAt: '2026-08-18T01:02:03Z',
    sequence: 1,
    runId: 'run-1',
    kind: 'lifecycle',
    fromState: 'done',
    toState: 'running',
    message: 'm',
  })
  assert.ok(violations.some((v) => v.includes('is not legal')), violations)
})

test('findEnvelopeViolations rejects a non-monotonic sequence and a wrong schema version', () => {
  const violations = findEnvelopeViolations({
    schemaVersion: 'control-plane/v0',
    source: 's',
    occurredAt: '2026-08-18T01:02:03Z',
    sequence: 0,
    runId: 'run-1',
    kind: 'lifecycle',
    message: 'm',
  })
  assert.ok(violations.some((v) => v.includes('schemaVersion must be')), violations)
  assert.ok(violations.some((v) => v.includes('sequence must be a positive integer')), violations)
})

test('redaction tripwire fires on a secret-shaped span and redact removes it', () => {
  const text = `token ${fakeSecretShaped} trailing`
  assert.deepEqual(findSecretShapes(text), ['sk-key'])
  const cleaned = redact(text)
  assert.ok(!cleaned.includes(fakeSecretShaped), cleaned)
  assert.ok(cleaned.includes('[redacted]'), cleaned)
  assert.deepEqual(findSecretShapes('ordinary log line'), [])
})

test('redact bounds an oversized message', () => {
  const cleaned = redact('x'.repeat(10_000))
  assert.ok(cleaned.length <= 4_000, String(cleaned.length))
})

// ─── The live repository ─────────────────────────────────────────────────────

test('the shipped registry agrees with the shipped source', async () => {
  const result = await runAudit()
  const all = [
    ...result.registry.violations,
    ...result.transitions.violations,
    ...result.envelope.violations,
  ]
  assert.deepEqual(all, [])
  assert.equal(result.ok, true)
})

test('the registry is not vacuously empty', () => {
  assert.ok(REGISTERED_STATE_MACHINES.length >= 10, String(REGISTERED_STATE_MACHINES.length))
  assert.ok(REGISTERED_EVENT_TYPES.length >= 4, String(REGISTERED_EVENT_TYPES.length))
  assert.ok(ENVELOPE_LEDGER.length >= 3, String(ENVELOPE_LEDGER.length))
  assert.equal(RUN_STATES.length, 9)
})

test('every canonical run state has at least one real producer', () => {
  const produced = new Set()
  for (const machine of REGISTERED_STATE_MACHINES) {
    for (const target of Object.values(machine.mapping)) {
      if (target) produced.add(target)
    }
  }
  const orphans = RUN_STATES.filter((state) => !produced.has(state))
  assert.deepEqual(orphans, [], `canonical states with no producer: ${orphans.join(', ')}`)
})
