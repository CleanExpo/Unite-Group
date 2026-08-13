// src/app/(founder)/founder/command-centre/__tests__/shell-slice1.smoke.test.ts
//
// UNI-2339 slice 1 — shell reshell regression gate. Source-contract style
// (mirrors ActionQueueTile.test.ts / EvidenceStreamTile.test.ts): the page
// is a Server Component with async data loaders, so it is asserted against
// its source rather than rendered. Confirms the distilled canvas keeps the
// CommandPalette anchors while removing duplicated home-page chrome.
//
// UNI-2378 (calm cockpit): the Action Queue and Evidence Stream sections
// relocated wholesale to the operations sub-route; those assertions now
// point at operations/page.tsx. The ⌘K palette anchors stay resolvable on
// the main page (the restrained domain links carry the ids).

import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src/app/(founder)/founder/command-centre')
const pageSrc = readFileSync(join(dir, 'page.tsx'), 'utf8')
const canvasSrc = readFileSync(join(dir, 'SixMonitorCanvas.tsx'), 'utf8')
const operationsSrc = readFileSync(join(dir, 'operations/page.tsx'), 'utf8')
const paletteSrc = readFileSync(join(dir, 'CommandPalette.tsx'), 'utf8')
const shellCss = readFileSync(join(dir, 'shell.module.css'), 'utf8')
const fontsSrc = readFileSync(join(dir, 'fonts/index.ts'), 'utf8')

// Every deck that carries the command-centre type register. Discovered, not
// enumerated: a hardcoded list stops policing the moment an eighth deck is
// added, and a new deck is precisely where a next/font/google import would
// reappear and break the offline build again.
const DECK_PAGES = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .map((p) => p.replaceAll('\\', '/'))
  .filter((p) => p === 'page.tsx' || p.endsWith('/page.tsx'))
  .sort()
const deckSrcs = DECK_PAGES.map((p) => readFileSync(join(dir, p), 'utf8'))
const FONT_FILES = [
  'chakra-petch-400.woff2',
  'chakra-petch-500.woff2',
  'chakra-petch-600.woff2',
  'chakra-petch-700.woff2',
  'syne-variable.woff2',
  'jetbrains-mono-variable.woff2',
]

describe('command-centre shell slice 1 — reshell regression gate', () => {
  it('binds the distilled canvas to the home route and removes the retired chrome imports', () => {
    expect(pageSrc).toContain('<header className={styles.statusStrip}>')
    expect(pageSrc).toContain("import { SixMonitorCanvas } from './SixMonitorCanvas'")
    expect(pageSrc).toContain('CommandPaletteTrigger')
    expect(pageSrc).toContain('<CommandPaletteTrigger')
    expect(pageSrc).toContain('<SixMonitorCanvas')
    expect(pageSrc).not.toContain("import { HeroBand } from './HeroBand'")
    expect(pageSrc).not.toContain('<HeroBand')
    expect(pageSrc).not.toContain('DECK_ROUTES')
    expect(pageSrc).not.toContain('DeckThemeShell')
    expect(pageSrc).not.toContain('<h1')
  })

  it('keeps every CommandPalette jump-target id intact (idea-console, portfolio, capability-bus)', () => {
    const anchorIds = [...paletteSrc.matchAll(/scrollTo\('([^']+)'\)/g)].map((m) => m[1])
    expect(anchorIds).toEqual(expect.arrayContaining(['portfolio', 'capability-bus']))
    expect(paletteSrc).toContain("getElementById('idea-console')")
    expect(pageSrc).toContain('<SixMonitorCanvas')
    for (const id of anchorIds) expect(canvasSrc).toContain(`id="${id}"`)
  })

  it('passes live queue and lane reads into the mounted canvas so degraded sources stay visible', () => {
    expect(pageSrc).toContain('loadActionQueueData()')
    expect(pageSrc).toContain('loadBlockedLanesData()')
    expect(pageSrc).toContain('getOperationalSourceStatus(actionQueue, blockedLanes)')
    expect(pageSrc).toMatch(/<SixMonitorCanvas[\s\S]*?actionQueue=\{actionQueue\}[\s\S]*?blockedLanes=\{blockedLanes\}/)
  })

  it('preserves the action-queue and evidence-stream section ids verbatim (relocated to the operations deck)', () => {
    expect(operationsSrc).toContain('id="action-queue"')
    expect(operationsSrc).toContain('id="evidence-stream"')
  })

  it('leaves the ActionQueueTile and EvidenceStreamTile components imported and rendered unchanged (operations deck)', () => {
    expect(operationsSrc).toContain('<ActionQueueTile data={actionQueue} />')
    expect(operationsSrc).toContain('<EvidenceStreamTile data={evidence} />')
  })

  it('scopes Syne + JetBrains Mono to this route only (self-hosted, distinct variables)', () => {
    expect(pageSrc).toContain("import { chakra, syne, jbMono } from './fonts'")
    expect(fontsSrc).toContain("variable: '--font-syne'")
    expect(fontsSrc).toContain("variable: '--font-jbmono'")
  })

  // The decks must never reach fonts.gstatic.com during `next build` — that
  // fetch is what broke the compile offline (NextFontError: Failed to fetch
  // `JetBrains Mono`). Every face is loaded from the committed woff2 files.
  it('loads every deck face from disk, with no next/font/google left in the route', () => {
    expect(fontsSrc).toContain("import localFont from 'next/font/local'")
    // Floor the population. A discovery that resolves to nothing would satisfy
    // the loop below while policing zero decks; seven exist today.
    expect(DECK_PAGES.length).toBeGreaterThanOrEqual(7)
    for (const src of deckSrcs) {
      expect(src).not.toContain('next/font/google')
    }
    for (const file of FONT_FILES) {
      expect(fontsSrc).toContain(file)
      expect(existsSync(join(dir, 'fonts', file))).toBe(true)
    }
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
