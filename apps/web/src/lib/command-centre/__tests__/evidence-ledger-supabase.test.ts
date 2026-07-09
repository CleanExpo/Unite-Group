import { describe, it, expect } from 'vitest'
import {
  summariseEvidenceLedgerRows,
  loadEvidenceLedgerFromSupabase,
  type EvidenceLedgerRow,
} from '@/lib/command-centre/evidence-ledger-supabase'

const NOW = () => new Date('2026-07-09T12:00:00.000Z')

function row(id: string, over: Partial<EvidenceLedgerRow> = {}): EvidenceLedgerRow {
  return {
    id,
    kind: 'compound_move',
    summary: 'Moved queue task to done',
    detail: {},
    evidence_path: `raw/command-centre/Unite-Hub/${id}.md`,
    created_at: '2026-07-09T11:00:00.000Z',
    ...over,
  }
}

describe('summariseEvidenceLedgerRows (UNI-2227 cloud Evidence Stream)', () => {
  it('maps fresh rows into the tile contract with supabase source paths', () => {
    const r = summariseEvidenceLedgerRows(
      [row('a', { summary: 'first' }), row('b', { kind: 'operator_gateway', summary: 'second' })],
      NOW,
    )
    expect(r.ledger_path).toBe('supabase://evidence_ledger')
    expect(r.entries).toHaveLength(2)
    expect(r.entries[0]).toMatchObject({
      raw: 'supabase://evidence_ledger/a',
      event: 'first',
      event_type: 'compound_move',
      timestamp: '2026-07-09T11:00:00.000Z',
      parse_error: null,
    })
    expect(r.entries[1]).toMatchObject({ raw: 'supabase://evidence_ledger/b', event: 'second', event_type: 'operator_gateway' })
    expect(r.parsed_lines).toBe(2)
    expect(r.malformed_lines).toBe(0)
    expect(r.total_lines).toBe(2)
  })

  it('newest-first ordering assigns descending line_index (highest = newest)', () => {
    const r = summariseEvidenceLedgerRows([row('newest'), row('oldest')], NOW)
    expect(r.entries[0].line_index).toBeGreaterThan(r.entries[1].line_index)
  })

  it('lifts repo/head_ref/head_sha/pr_url/merge_commit/safety out of detail', () => {
    const r = summariseEvidenceLedgerRows(
      [
        row('a', {
          detail: {
            repo: 'CleanExpo/Unite-Group',
            head_ref: 'feat/x',
            head_sha: 'abc123',
            pr_url: 'https://github.com/x/y/pull/1',
            merge_commit: 'def456',
            safety: { gate: 'green' },
          },
        }),
      ],
      NOW,
    )
    expect(r.entries[0]).toMatchObject({
      repo: 'CleanExpo/Unite-Group',
      head_ref: 'feat/x',
      head_sha: 'abc123',
      pr_url: 'https://github.com/x/y/pull/1',
      merge_commit: 'def456',
      safety: { gate: 'green' },
    })
  })

  it('caps to the given limit', () => {
    const rows = Array.from({ length: 60 }, (_, i) => row(`row-${i}`))
    const r = summariseEvidenceLedgerRows(rows, NOW, 50)
    expect(r.entries).toHaveLength(50)
  })

  it('surfaces a dropped count as malformed_lines without fabricating entries for them', () => {
    const r = summariseEvidenceLedgerRows([row('a')], NOW, 50, 3)
    expect(r.entries).toHaveLength(1)
    expect(r.malformed_lines).toBe(3)
    expect(r.total_lines).toBe(4)
  })
})

describe('loadEvidenceLedgerFromSupabase', () => {
  function clientReturning(payload: { data: unknown; error: { message: string } | null }) {
    return { from: () => ({ select: () => ({ order: () => ({ limit: async () => payload }) }) }) }
  }

  it('query error → ok:false with reason (caller falls back honestly)', async () => {
    const r = await loadEvidenceLedgerFromSupabase(
      clientReturning({ data: null, error: { message: 'relation missing' } }),
      NOW,
    )
    expect(r).toEqual({ ok: false, reason: 'relation missing' })
  })

  it('non-array response → ok:false', async () => {
    const r = await loadEvidenceLedgerFromSupabase(clientReturning({ data: {}, error: null }), NOW)
    expect(r).toEqual({ ok: false, reason: 'non-array response' })
  })

  it('rows → ok:true mapped result; malformed rows dropped', async () => {
    const r = await loadEvidenceLedgerFromSupabase(
      clientReturning({ data: [row('a'), { nope: true }, null, { id: 'b' }], error: null }),
      NOW,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.entries.map((e) => e.raw)).toEqual(['supabase://evidence_ledger/a'])
      expect(r.result.malformed_lines).toBe(3)
    }
  })
})
