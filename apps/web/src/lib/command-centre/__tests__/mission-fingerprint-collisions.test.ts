// Adversarial collision hunt against rawPacketFingerprint.
//
// The fingerprint's entire purpose is INJECTIVITY over route-legal packets: two
// packets the route accepted as different must produce different mission hashes.
// Twice now a "structural" fix to that property has itself been lossy - first a
// per-field classification that was wrong about the objective, then a hand-picked
// field list that flattened non-strings to null. Both were found by an independent
// reviewer rather than by me.
//
// So this suite exists to attack the property directly rather than assert it.
// Every case below is a PAIR that must hash differently, or a documented pair that
// must hash identically. A single unexpected match is a failure.
import { describe, it, expect } from 'vitest'
import { parseVoiceMissionPacket } from '@/lib/command-centre/voice-mission-bridge'

const BASE = {
  packet_id: 'pkt-collide',
  transcript_text: 'run it',
  summary: 'Run it',
  risk_level: 'low',
  actions: [{ kind: 'research' }],
} as const

/** Fingerprint of BASE plus overrides. Fails loudly if the packet is refused. */
function fp(overrides: Record<string, unknown>): string {
  const parsed = parseVoiceMissionPacket({ ...BASE, ...overrides })
  if (!parsed.ok) {
    throw new Error(`fixture refused (${parsed.reasons.join('; ')}) — probe cannot test injectivity`)
  }
  return parsed.mission.rawFingerprint
}

describe('rawPacketFingerprint is injective over route-legal packets', () => {
  it('POSITIVE CONTROL: identical packets hash identically', () => {
    // Without this, every "differs" assertion below would also pass against a
    // fingerprint that simply returned a random value each call.
    expect(fp({})).toBe(fp({}))
  })

  it('distinguishes a NUMBER from the string of the same value', () => {
    // The exact class the reviewer reproduced: the previous version coerced
    // non-strings to null, so 42 and 43 collided, as did 42 and "42".
    expect(fp({ requested_outcome: 42 })).not.toBe(fp({ requested_outcome: '42' }))
    expect(fp({ requested_outcome: 42 })).not.toBe(fp({ requested_outcome: 43 }))
    expect(fp({ approval_required: 1 })).not.toBe(fp({ approval_required: '1' }))
    expect(fp({ approval_required: true })).not.toBe(fp({ approval_required: 'true' }))
  })

  it('distinguishes null from absent, and null from the string "null"', () => {
    expect(fp({})).not.toBe(fp({ conversation_id: null }))
    expect(fp({ conversation_id: null })).not.toBe(fp({ conversation_id: 'null' }))
  })

  it('distinguishes false from absent and from 0', () => {
    // Falsy values are where `??` and `||` coercions historically leaked.
    expect(fp({})).not.toBe(fp({ approval_required: false }))
    expect(fp({ approval_required: false })).not.toBe(fp({ approval_required: 0 }))
  })

  it('distinguishes an empty string from absent', () => {
    expect(fp({})).not.toBe(fp({ approval_reason: '' }))
  })

  it('distinguishes nested object CONTENT at any depth', () => {
    expect(fp({ evidence_refs: { a: { b: 'x' } } })).not.toBe(
      fp({ evidence_refs: { a: { b: 'y' } } }),
    )
    expect(fp({ evidence_refs: { a: { b: 'x' } } })).not.toBe(
      fp({ evidence_refs: { a: { c: 'x' } } }),
    )
  })

  it('distinguishes an array from an object with numeric keys', () => {
    expect(fp({ evidence_refs: ['x'] })).not.toBe(fp({ evidence_refs: { 0: 'x' } }))
  })

  it('distinguishes array ORDER for arrays that are not `actions`', () => {
    // Only `actions` is order-insensitive, and only because admission consumes it
    // as a set. Every other array must stay order-significant.
    expect(fp({ evidence_refs: ['a', 'b'] })).not.toBe(fp({ evidence_refs: ['b', 'a'] }))
  })

  it('distinguishes unicode forms that are visually identical (NFC vs NFD)', () => {
    // 'café' composed vs decomposed. These are different byte sequences and must
    // stay different missions; silently unifying them would merge two instructions.
    expect(fp({ approval_reason: 'café' })).not.toBe(
      fp({ approval_reason: 'café' }),
    )
  })

  it('distinguishes a wholly unanticipated field', () => {
    // The whole point of hashing the entire packet: coverage does not depend on
    // anyone having listed the field.
    expect(fp({})).not.toBe(fp({ field_invented_next_year: 'v' }))
    expect(fp({ field_invented_next_year: 'a' })).not.toBe(
      fp({ field_invented_next_year: 'b' }),
    )
  })

  it('distinguishes action CONTENT beyond `kind`', () => {
    // actions are sorted, not reduced to their kinds, so extra properties count.
    expect(fp({ actions: [{ kind: 'research', target: 'a' }] })).not.toBe(
      fp({ actions: [{ kind: 'research', target: 'b' }] }),
    )
  })

  it('distinguishes a repeated action from a single one', () => {
    expect(fp({ actions: [{ kind: 'research' }] })).not.toBe(
      fp({ actions: [{ kind: 'research' }, { kind: 'research' }] }),
    )
  })

  it('REGRESSION: distinguishes -0 from 0, which JSON.stringify does not', () => {
    // The reviewer's second case. JSON.stringify(-0) is "0", so these collided.
    // Object.is separates them in memory even though stringify cannot.
    expect(fp({ evidence_refs: { n: -0 } })).not.toBe(fp({ evidence_refs: { n: 0 } }))
  })

  it('REGRESSION: REFUSES a packet whose number overflowed during JSON.parse', () => {
    // The reviewer's first case, and it cannot be fixed by encoding: 1e400 and 1e500
    // BOTH parse to Infinity, so they are already the same value before any of our
    // code runs. Encoding Infinity distinctly from null would stop it colliding with
    // null while leaving 1e400 and 1e500 colliding with each other. The only honest
    // response is refusal.
    const overflowed = JSON.parse('{"n": 1e400}') as { n: number }
    expect(Number.isFinite(overflowed.n)).toBe(false)
    const parsed = parseVoiceMissionPacket({ ...BASE, evidence_refs: { n: overflowed.n } })
    expect(parsed.ok).toBe(false)
  })

  it('REGRESSION: refuses a non-finite number nested deep in the packet', () => {
    const parsed = parseVoiceMissionPacket({
      ...BASE,
      evidence_refs: { a: { b: { c: [Number.POSITIVE_INFINITY] } } },
    })
    expect(parsed.ok).toBe(false)
  })

  it('GUARD: ordinary finite numbers are still accepted and distinguished', () => {
    // Refusing non-finite values must not become refusing numbers.
    expect(fp({ evidence_refs: { n: 1 } })).not.toBe(fp({ evidence_refs: { n: 2 } }))
    expect(fp({ evidence_refs: { n: 1.5 } })).not.toBe(fp({ evidence_refs: { n: 1.50001 } }))
    expect(fp({ evidence_refs: { n: 1e308 } })).not.toBe(fp({ evidence_refs: { n: 1e307 } }))
  })

  // ── Documented equivalences: these MUST match ─────────────────────────────

  it('EQUIVALENCE: key order does not matter', () => {
    const a = parseVoiceMissionPacket({ ...BASE })
    const b = parseVoiceMissionPacket({
      actions: BASE.actions,
      risk_level: BASE.risk_level,
      summary: BASE.summary,
      transcript_text: BASE.transcript_text,
      packet_id: BASE.packet_id,
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.mission.rawFingerprint).toBe(b.mission.rawFingerprint)
  })

  it('EQUIVALENCE: nested key order does not matter either', () => {
    expect(fp({ evidence_refs: { a: '1', b: '2' } })).toBe(
      fp({ evidence_refs: { b: '2', a: '1' } }),
    )
  })

  it('EQUIVALENCE: `actions` order does not matter — the one claimed exception', () => {
    // Sound because admission reads actionKinds as a set and no path reads order,
    // confirmed independently by the reviewer. Pinned so it cannot silently change.
    expect(fp({ actions: [{ kind: 'research' }, { kind: 'draft' }] })).toBe(
      fp({ actions: [{ kind: 'draft' }, { kind: 'research' }] }),
    )
  })
})
