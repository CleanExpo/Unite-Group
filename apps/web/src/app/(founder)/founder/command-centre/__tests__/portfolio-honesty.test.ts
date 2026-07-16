import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The Portfolio Registry section renders CONFIGURED data derived from the
// portfolio SSOT (.portfolio/PORTFOLIO.yaml via lib/command-centre/registry.ts).
// No-Invaders #1: configured data must not be dressed as live monitoring. This
// guards the honesty caption + the absence of a liveness claim on a server
// component that reads from the filesystem (can't render-test directly).
// UNI-2378 (calm cockpit): the registry section relocated wholesale to the
// portfolio sub-route; the contract follows it there.
const source = readFileSync(
  join(process.cwd(), 'src/app/(founder)/founder/command-centre/portfolio/page.tsx'),
  'utf8',
)

describe('command-centre Portfolio Registry — configured, not live', () => {
  it('captions the registry as configured lifecycle state, not a live health probe', () => {
    expect(source).toContain('static project registry')
    expect(source).toContain('not a live health probe')
  })

  it('does not label the configured registry count as "live"', () => {
    // Previously "{projects.length} units · {activeCount} live" implied live monitoring.
    expect(source).not.toContain('} live</span>')
    expect(source).toContain('{activeCount} active')
  })
})
