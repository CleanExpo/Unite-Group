// src/app/(founder)/founder/command-centre/StageBoardTile.test.ts
//
// Mission Control Day 1 — "Projects by stage" tile: source contract + loader states.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadStageBoardData } from './StageBoardTile'

const src = readFileSync(join(process.cwd(), 'src/app/(founder)/founder/command-centre/StageBoardTile.tsx'), 'utf8')

describe('StageBoardTile source contract', () => {
  it('is a server component (no "use client" directive)', () => {
    expect(src).not.toMatch(/^['"]use client['"]/m)
  })
  it('renders the data-testid hooks for board, row, word, empty and error states', () => {
    for (const id of ['stage-board-tile', 'stage-board-row', 'stage-board-word', 'stage-board-tile-empty', 'stage-board-tile-error']) {
      expect(src).toContain(`data-testid="${id}"`)
    }
  })
  it('exposes a loader that NEVER throws and always stamps checked_at', () => {
    expect(src).toContain('export async function loadStageBoardData')
    expect(src).toMatch(/catch\s*\(\s*err\s*:\s*unknown\s*\)/)
    expect(src).toContain('checked_at')
  })
  it('does not use client hooks, or touch the key or the network itself (the lib does)', () => {
    expect(src).not.toMatch(/\buse(State|Effect|Reducer|Ref)\b/)
    expect(src).not.toMatch(/process\.env\.[A-Z_]*(?:SECRET|KEY|TOKEN)/)
    expect(src).not.toMatch(/fetch\(|axios\.|http\.|https\./)
  })
})

describe('loadStageBoardData', () => {
  it('reports not_configured when LINEAR_API_KEY is absent, with no rows and no error', async () => {
    const saved = process.env.LINEAR_API_KEY
    delete process.env.LINEAR_API_KEY
    try {
      const data = await loadStageBoardData(() => new Date('2026-09-03T00:00:00Z'))
      expect(data).toEqual({ checked_at: '2026-09-03T00:00:00.000Z', teams: [], not_configured: true, read_error: null })
    } finally {
      if (saved !== undefined) process.env.LINEAR_API_KEY = saved
    }
  })
})
