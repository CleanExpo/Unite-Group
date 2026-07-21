// src/app/(founder)/founder/command-centre/__tests__/shell-slice1.smoke.test.ts
//
// UNI-2339 slice 1 — shell reshell regression gate. Source-contract style
// (mirrors ActionQueueTile.test.ts / EvidenceStreamTile.test.ts): the page
// is a Server Component with async data loaders, so it is asserted against
// its source rather than rendered. Confirms the canvas shell landed without
// disturbing any pre-existing data-testid or CommandPalette anchor id.
//
// UNI-2378 (calm cockpit): the Action Queue and Evidence Stream sections
// relocated wholesale to the operations sub-route; those assertions now
// point at operations/page.tsx. The ⌘K palette anchors stay resolvable on
// the main page (the Vital Signs nav cards carry the ids).

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src/app/(founder)/founder/command-centre')
const pageSrc = readFileSync(join(dir, 'page.tsx'), 'utf8')
const operationsSrc = readFileSync(join(dir, 'operations/page.tsx'), 'utf8')
const paletteSrc = readFileSync(join(dir, 'CommandPalette.tsx'), 'utf8')
const shellCss = readFileSync(join(dir, 'shell.module.css'), 'utf8')

describe('command-centre shell slice 1 — reshell regression gate', () => {
  it('renders the HeroBand at the top of the page, sourced from the already-loaded actionQueue (no duplicate fetch)', () => {
    expect(pageSrc).toContain("import { HeroBand } from './HeroBand'")
    expect(pageSrc).toContain('<HeroBand data={actionQueue} />')
  })

  it('keeps every CommandPalette jump-target id intact (idea-console, portfolio, capability-bus)', () => {
    const anchorIds = [...paletteSrc.matchAll(/scrollTo\('([^']+)'\)/g)].map((m) => m[1])
    expect(anchorIds).toEqual(expect.arrayContaining(['portfolio', 'capability-bus']))
    expect(paletteSrc).toContain("getElementById('idea-console')")
    for (const id of anchorIds) {
      expect(pageSrc).toContain(`id="${id}"`)
    }
  })

  it('preserves the action-queue and evidence-stream section ids verbatim (relocated to the operations deck)', () => {
    expect(operationsSrc).toContain('id="action-queue"')
    expect(operationsSrc).toContain('id="evidence-stream"')
  })

  it('leaves the ActionQueueTile and EvidenceStreamTile components imported and rendered unchanged (operations deck)', () => {
    expect(operationsSrc).toContain('<ActionQueueTile data={actionQueue} />')
    expect(operationsSrc).toContain('<EvidenceStreamTile data={evidence} />')
  })

  it('scopes Syne + JetBrains Mono to this route only (next/font/google, distinct variables)', () => {
    expect(pageSrc).toContain("Syne, JetBrains_Mono } from 'next/font/google'")
    expect(pageSrc).toContain("variable: '--font-syne'")
    expect(pageSrc).toContain("variable: '--font-jbmono'")
  })

  it('gives every backdrop-filter a solid @supports fallback to --surface-2 (perf gate)', () => {
    // Base rules resolve to a solid surface first (the auto-degrade target).
    expect(shellCss).toContain('background: var(--surface-2)')
    // Every backdrop-filter declaration lives inside an @supports feature-query
    // guard — never applied unconditionally.
    const supportsGuards = shellCss.match(/@supports \(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\) \{/g) ?? []
    const backdropDecls = shellCss.match(/(?<!-webkit-)backdrop-filter: var\(--blur/g) ?? []
    expect(supportsGuards.length).toBeGreaterThan(0)
    expect(backdropDecls.length).toBe(supportsGuards.length)
  })

  it('gives the section heads their own opaque dark ground (near-white --ink on the light deck is ~1.09:1)', () => {
    const headBlock = shellCss.match(/\.glassSectionHead \{[^}]*\}/)?.[0] ?? ''
    expect(headBlock).toContain('background: var(--surface-2)')
    // Small mono taglines use --ink-dim (~7.2:1 on --surface-2), never
    // --ink-hush (~3.6:1, below AA for 12px/10px text).
    const subBlock = shellCss.match(/\.glassSub \{[^}]*\}/)?.[0] ?? ''
    const srcBlock = shellCss.match(/\.glassSrc \{[^}]*\}/)?.[0] ?? ''
    expect(subBlock).toContain('color: var(--ink-dim)')
    expect(srcBlock).toContain('color: var(--ink-dim)')
  })
})
