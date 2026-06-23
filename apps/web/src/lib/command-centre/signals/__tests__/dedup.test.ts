// src/lib/command-centre/signals/__tests__/dedup.test.ts
// TDD: Unit 2 — shouldIngest (pure). Decides whether a normalised signal should
// become a proposed task: drops duplicates (by external_ref), empties, and
// obvious transport noise. No I/O.
import { describe, it, expect } from 'vitest'
import { shouldIngest } from '../dedup'
import type { NormalisedSignal } from '../normalise'

const signal: NormalisedSignal = {
  title: 'Add a dark-mode toggle',
  objective: 'Add a dark-mode toggle to settings',
  origin: 'idea',
  externalRef: 'tg-123',
  projectKey: null,
  source: 'telegram',
  severity: 'info',
  observedAt: '2026-06-23T08:00:00.000Z',
}

describe('shouldIngest', () => {
  it('ingests a fresh, substantive signal', () => {
    expect(shouldIngest(signal, [])).toEqual({ ingest: true })
  })

  it('skips a signal whose external ref was already ingested', () => {
    const res = shouldIngest(signal, ['tg-001', 'tg-123', 'tg-200'])
    expect(res.ingest).toBe(false)
    expect(res.reason).toBe('duplicate')
  })

  it('skips a signal with empty or whitespace-only text', () => {
    expect(shouldIngest({ ...signal, objective: '   ' }, []).ingest).toBe(false)
    expect(shouldIngest({ ...signal, objective: '' }, []).reason).toBe('empty')
  })

  it('skips obvious transport noise (heartbeats, bot echoes)', () => {
    for (const noise of ['ok', 'ping', 'pong', 'heartbeat', '👍']) {
      const res = shouldIngest({ ...signal, objective: noise, title: noise }, [])
      expect(res.ingest).toBe(false)
      expect(res.reason).toBe('noise')
    }
  })

  it('does not treat a substantive message containing a noise word as noise', () => {
    const res = shouldIngest({ ...signal, objective: 'ping the API is failing on every health check' }, [])
    expect(res.ingest).toBe(true)
  })
})
