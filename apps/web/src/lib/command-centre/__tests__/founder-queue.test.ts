// src/lib/command-centre/__tests__/founder-queue.test.ts
//
// Mission Control Day 1 — the "Blocked on me" reader. Fixtures mirror the
// repo-root scripts/__tests__/founder-queue.test.mjs cases; the last block is
// a PARITY test that runs both parsers over the live ledger.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ageOpenRows, computeAgeDays, loadFounderQueue, parseFounderQueue } from '@/lib/command-centre/founder-queue'

const NOW = '2026-09-03T00:00:00Z'

const OPEN_HEADER = `| ID | Decision | Opened | Age (days) | Blocks | Context | Status |
| --- | --- | --- | --- | --- | --- | --- |`

function ledger(openRows: string, resolvedRows = '') {
  return `# FOUNDER QUEUE

## Open

${OPEN_HEADER}
${openRows}

## Resolved

| ID | Decision | Opened | Resolved | Decision text |
| --- | --- | --- | --- | --- |
${resolvedRows}
`
}

describe('computeAgeDays', () => {
  it('counts whole Brisbane calendar days from the opened date', () => {
    expect(computeAgeDays('2026-09-03', NOW)).toBe(0)
    expect(computeAgeDays('2026-07-06', NOW)).toBe(59)
  })
  it('refuses a future date, an impossible date, and a non-date', () => {
    expect(() => computeAgeDays('2026-09-04', NOW)).toThrow(/after the current Brisbane date/)
    expect(() => computeAgeDays('2026-02-31', NOW)).toThrow(/Not a real calendar date/)
    expect(() => computeAgeDays('—', NOW)).toThrow(/Unparseable opened date/)
  })
})

describe('parseFounderQueue', () => {
  it('reads open and resolved rows and ignores the hand-typed age column', () => {
    const parsed = parseFounderQueue(
      ledger(
        `| F2 | Click Connect Google | 2026-07-06 | 41 | UNI-2329 | one consent click | open |
| F1 | Flip the env var | 2026-08-16 | — | identity cutover | founder-only | open |`,
        `| D19 | CI substrate | 2026-08-16 | 2026-08-17 | Ephemeral Postgres |`,
      ),
    )
    expect(parsed.malformed).toEqual([])
    expect(parsed.open.map((r) => r.id)).toEqual(['F2', 'F1'])
    expect(parsed.open[0]).toMatchObject({ opened: '2026-07-06', blocks: 'UNI-2329', status: 'open' })
    expect(parsed.resolved).toEqual([
      { id: 'D19', decision: 'CI substrate', opened: '2026-08-16', resolved: '2026-08-17', text: 'Ephemeral Postgres' },
    ])
  })

  it('reports a row with the wrong width instead of dropping it', () => {
    const parsed = parseFounderQueue(ledger(`| F2 | Click Connect Google | 2026-07-06 | — | UNI-2329 | open |`))
    expect(parsed.open).toEqual([])
    expect(parsed.malformed).toHaveLength(1)
    expect(parsed.malformed[0]).toMatch(/has 6 cells, expected exactly 7/)
  })

  it('reports a row that drifted out of its table body', () => {
    const parsed = parseFounderQueue(`${ledger('')}\n| F9 | drifted | 2026-08-01 | — | x | y | open |\n`)
    expect(parsed.malformed.some((m) => /outside any table body/.test(m))).toBe(true)
  })

  it('treats a header with no separator as unproven, not empty', () => {
    const parsed = parseFounderQueue(`## Open\n\n| ID | Decision | Opened | Age (days) | Blocks | Context | Status |\n`)
    expect(parsed.malformed.some((m) => /no separator beneath it/.test(m))).toBe(true)
  })

  it('treats a missing Open header as unproven', () => {
    expect(parseFounderQueue('# nothing here\n').malformed).toContain(
      'The Open table header was never found; no row could be attributed to it.',
    )
  })
})

describe('ageOpenRows', () => {
  it('ages rows oldest-first and names a row whose date does not compute', () => {
    const { aged, unaged } = ageOpenRows(
      [
        { id: 'F1', decision: 'a', opened: '2026-08-16', blocks: '', context: '', status: 'open' },
        { id: 'F2', decision: 'b', opened: '2026-07-06', blocks: '', context: '', status: 'open' },
        { id: 'F9', decision: 'c', opened: 'soon', blocks: '', context: '', status: 'open' },
      ],
      NOW,
    )
    expect(aged.map((r) => [r.id, r.age_days])).toEqual([
      ['F2', 59],
      ['F1', 18],
    ])
    expect(unaged).toEqual(['F9: Unparseable opened date: "soon"'])
  })
})

describe('loadFounderQueue against the live ledger', () => {
  it('reads FOUNDER-QUEUE.md from the repo root (dev fallback) and ages every open row', async () => {
    const result = await loadFounderQueue()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows[0].age_days).toBeGreaterThanOrEqual(result.rows[result.rows.length - 1].age_days)
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('PARITY: the TypeScript parser and scripts/founder-queue.mjs agree on the live ledger', async () => {
    const root = path.resolve(process.cwd(), '..', '..')
    const raw = readFileSync(path.join(root, 'FOUNDER-QUEUE.md'), 'utf8')
    const mjsPath = pathToFileURL(path.join(root, 'scripts', 'founder-queue.mjs')).href
    const mjs = await import(mjsPath)
    const theirs = mjs.parseFounderQueue(raw)
    const ours = parseFounderQueue(raw)
    expect(ours.open).toEqual(theirs.open)
    expect(ours.resolved).toEqual(theirs.resolved)
    expect(ours.malformed).toEqual(theirs.malformed)
    for (const row of ours.open) {
      expect(computeAgeDays(row.opened, NOW)).toBe(mjs.computeAgeDays(row.opened, NOW))
    }
  })
})
