// src/app/(founder)/founder/command-centre/InProgressPRsTile.test.ts
//
// Lane 16.5 — Lane 16 component source contract tests.
//
// UNI-2340 fast-follow: converted to a 'use client' tile that fetches its own
// data (mirroring the sibling GitHub tiles) instead of blocking the command
// deck's SSR — see InProgressPRsTile.tsx header comment for the incident.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const path = join(
  root,
  'src/app/(founder)/founder/command-centre/InProgressPRsTile.tsx',
)

describe('InProgressPRsTile source contract', () => {
  const src = readFileSync(path, 'utf8')

  it('is a client component (fetches its own data, does not block SSR)', () => {
    expect(src).toMatch(/^['"]use client['"]/m)
  })

  it('fetches the dedicated command-centre API route', () => {
    expect(src).toContain("fetch('/api/command-centre/in-progress-prs')")
  })

  it('polls on an interval rather than fetching once', () => {
    expect(src).toMatch(/setInterval\(load, POLL_MS\)/)
  })

  it('renders the data-testid hook used by the deck selector', () => {
    expect(src).toContain('data-testid="in-progress-prs-tile"')
  })

  it('renders the data-testid empty-state hook when there are no open PRs', () => {
    expect(src).toContain('data-testid="in-progress-prs-tile-empty"')
  })

  it('attaches the PR number as a data attribute for backref hooks', () => {
    expect(src).toContain('data-pr-number={pr.number}')
  })

  it('does not store or read any secret-shaped env vars', () => {
    expect(src).not.toMatch(/process\.env\.[A-Z_]*(?:SECRET|KEY|TOKEN)/)
  })
})
