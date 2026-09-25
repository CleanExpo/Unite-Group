// src/app/(founder)/founder/command-centre/BlockedOnMeTile.test.ts
//
// Mission Control Day 1 — "Blocked on me" tile: source contract + loader.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadBlockedOnMeData } from './BlockedOnMeTile'

const src = readFileSync(join(process.cwd(), 'src/app/(founder)/founder/command-centre/BlockedOnMeTile.tsx'), 'utf8')

describe('BlockedOnMeTile source contract', () => {
  it('is a server component (no "use client" directive)', () => {
    expect(src).not.toMatch(/^['"]use client['"]/m)
  })
  it('renders the data-testid hooks for list, row, empty and error states', () => {
    for (const id of ['blocked-on-me-tile', 'blocked-on-me-row', 'blocked-on-me-tile-empty', 'blocked-on-me-tile-error']) {
      expect(src).toContain(`data-testid="${id}"`)
    }
  })
  it('exposes a loader that NEVER throws and always stamps checked_at', () => {
    expect(src).toContain('export async function loadBlockedOnMeData')
    expect(src).toMatch(/catch\s*\(\s*err\s*:\s*unknown\s*\)/)
    expect(src).toContain('checked_at')
  })
  it('does not use client hooks, secrets, or network', () => {
    expect(src).not.toMatch(/\buse(State|Effect|Reducer|Ref)\b/)
    expect(src).not.toMatch(/process\.env\.[A-Z_]*(?:SECRET|KEY|TOKEN)/)
    expect(src).not.toMatch(/fetch\(|axios\.|http\.|https\./)
  })
})

describe('loadBlockedOnMeData', () => {
  it('reads the live ledger with every open row aged, oldest first, and never throws', async () => {
    const data = await loadBlockedOnMeData(() => new Date())
    expect(data.read_error).toBeNull()
    expect(data.total_rows).toBeGreaterThan(0)
    expect(data.oldest_id).toBe(data.rows[0]?.id ?? null)
    const ages = data.rows.map((r) => r.age_days)
    expect([...ages].sort((a, b) => b - a)).toEqual(ages)
    expect(data.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
