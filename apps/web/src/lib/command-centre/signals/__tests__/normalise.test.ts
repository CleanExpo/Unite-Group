// src/lib/command-centre/signals/__tests__/normalise.test.ts
// TDD: Unit 1 — normaliseSignal (pure). Maps a raw inbound signal onto the
// shape the intake pipeline consumes, using ONLY existing valid TaskOrigin
// values ('idea' | 'blocker') — no new origin (cc_tasks.origin has a CHECK
// constraint), and external_ref as the dedup key.
import { describe, it, expect } from 'vitest'
import { normaliseSignal, type RawSignal } from '../normalise'

const base: RawSignal = {
  source: 'telegram',
  externalRef: 'tg-123',
  text: 'We should add a dark-mode toggle to the settings page',
  observedAt: '2026-06-23T08:00:00.000Z',
}

describe('normaliseSignal', () => {
  it('derives a concise title from the first line of the text', () => {
    const n = normaliseSignal(base)
    expect(n.title).toBe('We should add a dark-mode toggle to the settings page')
    expect(n.objective).toBe(base.text)
  })

  it('caps an over-long title at 80 chars with an ellipsis', () => {
    const long = 'x'.repeat(200)
    const n = normaliseSignal({ ...base, text: long })
    expect(n.title.length).toBe(80)
    expect(n.title.endsWith('...')).toBe(true)
  })

  it('uses only the first line for the title but keeps full text as objective', () => {
    const n = normaliseSignal({ ...base, text: 'Short headline\nmore detail below\nand more' })
    expect(n.title).toBe('Short headline')
    expect(n.objective).toBe('Short headline\nmore detail below\nand more')
  })

  it("maps an error/health source to origin 'blocker'", () => {
    expect(normaliseSignal({ ...base, source: 'error' }).origin).toBe('blocker')
    expect(normaliseSignal({ ...base, source: 'health' }).origin).toBe('blocker')
  })

  it("maps a critical/warning severity to origin 'blocker' regardless of source", () => {
    expect(normaliseSignal({ ...base, severity: 'critical' }).origin).toBe('blocker')
    expect(normaliseSignal({ ...base, severity: 'warning' }).origin).toBe('blocker')
  })

  it("maps an informational telegram/cron signal to origin 'idea'", () => {
    expect(normaliseSignal(base).origin).toBe('idea')
    expect(normaliseSignal({ ...base, source: 'cron', severity: 'info' }).origin).toBe('idea')
  })

  it('carries the external ref, source, observedAt and a defaulted severity', () => {
    const n = normaliseSignal(base)
    expect(n.externalRef).toBe('tg-123')
    expect(n.source).toBe('telegram')
    expect(n.observedAt).toBe('2026-06-23T08:00:00.000Z')
    expect(n.severity).toBe('info')
  })

  it('passes through an optional projectKey, defaulting to null', () => {
    expect(normaliseSignal(base).projectKey).toBeNull()
    expect(normaliseSignal({ ...base, projectKey: 'synthex' }).projectKey).toBe('synthex')
  })
})
