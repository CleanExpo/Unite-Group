// src/app/(founder)/founder/command-centre/AgentEventsWallTile.test.ts
//
// UNI-2384 — Matrix wall Wave B2 tile source contract (idiom:
// EvidenceStreamTile.test.ts). Locks the honest-state renderings.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const path = join(
  root,
  'src/app/(founder)/founder/command-centre/AgentEventsWallTile.tsx',
)

describe('AgentEventsWallTile source contract', () => {
  const src = readFileSync(path, 'utf8')

  it('is a server component (no "use client" directive)', () => {
    expect(src).not.toMatch(/^['"]use client['"]/m)
  })

  it('renders the calm dark state when the founder-gated migration is not applied', () => {
    expect(src).toContain('data-testid="agent-events-wall-dark"')
    expect(src).toContain('Wall dark — cc_agent_events migration not applied')
  })

  it('renders the honest empty state — no fabricated activity', () => {
    expect(src).toContain('data-testid="agent-events-wall-empty"')
    expect(src).toContain('No agent events yet — runner not armed')
  })

  it('renders the error state without dropping to fake rows', () => {
    expect(src).toContain('data-testid="agent-events-wall-error"')
  })

  it('states the newest event age plainly so stale data never reads as live', () => {
    expect(src).toContain('newest event {relativeAge(newest.created_at, nowMs)}')
  })

  it('has no fake live indicators (no spinner / pulse / animation)', () => {
    expect(src).not.toMatch(/spinner|pulse|animation|blink/i)
  })

  it('renders per-row event id data attribute for backref hooks', () => {
    expect(src).toContain('data-event-id={e.id}')
  })

  it('does not use any client-only React hooks (useState/useEffect)', () => {
    expect(src).not.toMatch(/\buse(State|Effect|Reducer|Ref)\b/)
  })
})
