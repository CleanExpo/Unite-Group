// src/app/(founder)/founder/command-centre/__tests__/shell-slice2.smoke.test.ts
//
// UNI-2339 slice 2 — canvas migration regression gate. Source-contract style
// (mirrors shell-slice1.smoke.test.ts): the pages are Server Components with
// async data loaders, so they are asserted against their source. Covers the
// Operate launch-pad, the read-only PipelineBoard revival, the Approvals
// (Task Queue) + Agent fleet migration, the deck-ground flip, and the
// contrast pins for every token the flip re-points.
//
// UNI-2378 (calm cockpit): the dense tiles relocated wholesale onto four
// sub-routes (operations / portfolio / providers / knowledge). Assertions
// follow the tiles to their new page sources — none are weakened.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src/app/(founder)/founder/command-centre')
const pageSrc = readFileSync(join(dir, 'page.tsx'), 'utf8')
const operationsSrc = readFileSync(join(dir, 'operations/page.tsx'), 'utf8')
const portfolioSrc = readFileSync(join(dir, 'portfolio/page.tsx'), 'utf8')
const providersSrc = readFileSync(join(dir, 'providers/page.tsx'), 'utf8')
const knowledgeSrc = readFileSync(join(dir, 'knowledge/page.tsx'), 'utf8')
const shellCss = readFileSync(join(dir, 'shell.module.css'), 'utf8')
const deckCss = readFileSync(join(dir, 'command-deck.module.css'), 'utf8')
const stepsCss = readFileSync(join(dir, 'CommandSteps.module.css'), 'utf8')
const boardSrc = readFileSync(
  join(process.cwd(), 'src/components/command-centre/pipeline/PipelineBoard.tsx'),
  'utf8',
)
const hubSrc = readFileSync(
  join(process.cwd(), 'src/components/founder/dashboard/HubStatusWidget.tsx'),
  'utf8',
)
const coachSrc = readFileSync(
  join(process.cwd(), 'src/components/founder/dashboard/CoachBriefs.tsx'),
  'utf8',
)

const allPageSources = [pageSrc, operationsSrc, portfolioSrc, providersSrc, knowledgeSrc]

describe('command-centre shell slice 2 — canvas migration regression gate', () => {
  it('renders the Operate launch-pad from the static BUSINESSES registry (no invented fields)', () => {
    expect(portfolioSrc).toContain("import { BUSINESSES } from '@/lib/businesses'")
    expect(portfolioSrc).toContain('id="operate-launch-pad"')
    expect(portfolioSrc).toContain('{BUSINESSES.map((business) =>')
    // The registry has no purpose/description field — the tile shows only
    // name, type · status and the repo link. No other business copy exists.
    expect(portfolioSrc).toContain('{business.name}')
    expect(portfolioSrc).toContain('{business.type} · {business.status}')
    expect(portfolioSrc).toContain('href={business.repoUrl}')
  })

  it('revives PipelineBoard READ-ONLY: server-side read model, no mutation handler wired', () => {
    expect(portfolioSrc).toContain(
      "import { PipelineBoard } from '@/components/command-centre/pipeline/PipelineBoard'",
    )
    expect(portfolioSrc).toContain(
      "import { loadPipelineOpportunities } from '@/lib/command-centre/pipeline-opportunities'",
    )
    expect(portfolioSrc).toContain('id="pipeline"')
    // Read-only contract: the board's only interactive prop is never passed
    // (the '=' matters — the page comment names the prop to explain why not).
    expect(portfolioSrc).not.toContain('onSelectOpportunity=')
    // Honest provenance: the badge label names the system of record.
    expect(portfolioSrc).toContain('sourceLabel="crm_opportunities"')
  })

  it('migrates Approvals (Task Queue) and Agent fleet onto the canvas register, tiles unchanged', () => {
    // Heads carry the glass chrome; ids stay (relocated to the operations deck).
    for (const id of ['task-queue', 'agent-fleet']) {
      expect(operationsSrc).toMatch(
        new RegExp(`\\$\\{shell\\.canvasScope\\} \\$\\{shell\\.glassSectionHead\\}\`\\} id="${id}"`),
      )
    }
    // Tiles are imported and rendered exactly as before.
    expect(operationsSrc).toContain('<QueueBoard />')
    expect(operationsSrc).toContain('<MeshFleetTile />')
  })

  it('leaves no section on the retired light-deck head register (all five deck pages)', () => {
    for (const src of allPageSources) {
      expect(src).not.toContain('styles.sectionHead')
      expect(src).not.toContain('styles.sectionLabel')
      expect(src).not.toContain('styles.sectionCaption')
    }
  })

  it('keeps every pre-existing section anchor id intact on its relocated deck (UNI-2378)', () => {
    // Main page: the ⌘K palette anchors land on the Vital Signs nav cards.
    for (const id of ['portfolio', 'capability-bus']) {
      expect(pageSrc).toContain(`id="${id}"`)
    }
    // Operations deck.
    for (const id of [
      'operations-visibility',
      'task-queue',
      'crm-autonomy',
      'agent-fleet',
      'os-health',
      'evidence-stream',
      'action-queue',
      'blocked-lanes',
      'in-progress-prs',
    ]) {
      expect(operationsSrc).toContain(`id="${id}"`)
    }
    // Portfolio deck.
    for (const id of ['operate-launch-pad', 'pipeline', 'portfolio', 'project-integrations', 'founder-cockpit']) {
      expect(portfolioSrc).toContain(`id="${id}"`)
    }
    // Knowledge deck.
    for (const id of ['wiki-knowledge-base', 'capability-bus']) {
      expect(knowledgeSrc).toContain(`id="${id}"`)
    }
  })

  it('links every relocated deck from the calm home and back (deck nav + back-links)', () => {
    for (const route of ['operations', 'portfolio', 'providers', 'knowledge']) {
      expect(pageSrc).toContain(`/founder/command-centre/${route}`)
    }
    for (const src of [operationsSrc, portfolioSrc, providersSrc, knowledgeSrc]) {
      expect(src).toContain('href="/founder/command-centre"')
      expect(src).toContain('Command deck')
    }
  })

  it('keeps backdrop-filter guard/declaration parity in shell.module.css (perf auto-degrade)', () => {
    const supportsGuards =
      shellCss.match(
        /@supports \(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\) \{/g,
      ) ?? []
    const backdropDecls = shellCss.match(/(?<!-webkit-)backdrop-filter: var\(--blur/g) ?? []
    expect(supportsGuards.length).toBeGreaterThan(0)
    expect(backdropDecls.length).toBe(supportsGuards.length)
    // The launch tiles are deliberately solid --surface-3 (no new backdrop use).
    const tileBlock = shellCss.match(/\.launchTile \{[^}]*\}/)?.[0] ?? ''
    expect(tileBlock).toContain('background: var(--surface-3)')
    expect(tileBlock).not.toContain('backdrop-filter')
  })

  it('flips the deck ground to the canvas register (Gun Metal, not candy light)', () => {
    const deckBlock = deckCss.match(/\.deck \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(deckBlock).toContain('background-color: #0e1014')
    expect(deckBlock).not.toContain('#fffdf7')
    expect(deckBlock).not.toContain('#ffffff')
  })

  it('re-points every deck TEXT token to a computed AA pairing on the dark grounds', () => {
    // Ratios computed against --deck-panel #1c2230 (worst-case opaque panel)
    // and the #0e1014 canvas. WCAG relative-luminance math, not eyeballed:
    //   --deck-text  #f0f3f7 → 14.28:1 panel / 17.11:1 canvas
    //   --deck-muted #a6afbc →  7.18:1 panel /  8.60:1 canvas
    //   --deck-cyan-text  #34d399 → 8.27:1 panel
    //   --deck-amber-text #f0a94c → 7.94:1 panel
    //   --deck-abort-text #f87171 → 5.75:1 panel
    //   --cc-ink-hush #8b96a5 → 5.30:1 panel / 5.93:1 on --cc-bg-soft #141820
    expect(deckCss).toContain('--deck-text: #f0f3f7')
    expect(deckCss).toContain('--deck-muted: #a6afbc')
    expect(deckCss).toContain('--deck-cyan-text: #34d399')
    expect(deckCss).toContain('--deck-amber-text: #f0a94c')
    expect(deckCss).toContain('--deck-abort-text: #f87171')
    expect(deckCss).toContain('--cc-ink-hush: #8b96a5')
    // Panels resolve from the flipped tokens — no hard-coded light card left.
    expect(deckCss).toContain('--deck-panel: #1c2230')
    expect(deckCss).toContain('--deck-panel-hi: #232b3a')
    expect(deckCss).toContain('--cc-bg-soft: #141820')
    expect(deckCss).not.toContain('#fff7ec')
  })

  it('keeps dark-on-light text off the dark canvas (CommandSteps head is token-driven)', () => {
    // The 1-2-3 hero head sits directly on the deck ground; its old literals
    // (#14241b / #5a6b62) would be ~1.6:1 on #0e1014. The white step CARDS
    // below keep their own opaque ground and stay dark-on-light.
    const titleBlock = stepsCss.match(/\.title \{[^}]*\}/)?.[0] ?? ''
    const subBlock = stepsCss.match(/\.sub \{[^}]*\}/)?.[0] ?? ''
    expect(titleBlock).toContain('color: var(--deck-text')
    expect(subBlock).toContain('color: var(--deck-muted')
    expect(stepsCss).toContain('background: #ffffff')
  })

  it('pins the launch-tile text pairings on their solid --surface-3 ground', () => {
    // --ink #f0f3f7 on #232b3a → 12.77:1; --ink-dim #a6afbc → 6.41:1;
    // --green-txt #34d399 (repo link) → 7.39:1. Computed, all AA.
    const nameBlock = shellCss.match(/\.launchName \{[^}]*\}/)?.[0] ?? ''
    const metaBlock = shellCss.match(/\.launchMeta \{[^}]*\}/)?.[0] ?? ''
    const linkBlock = shellCss.match(/\.launchLink \{[^}]*\}/)?.[0] ?? ''
    expect(nameBlock).toContain('color: var(--ink)')
    expect(metaBlock).toContain('color: var(--ink-dim)')
    expect(linkBlock).toContain('color: var(--green-txt)')
  })

  it('surfaces the rollup-excluded count in the pipeline head — no silent under-report (RA-1109)', () => {
    // The read model drops terminal/parked rows by design; the page must say
    // so whenever the drop is non-zero, next to the provenance label.
    expect(portfolioSrc).toContain('pipeline.excludedCount > 0')
    expect(portfolioSrc).toContain('lost/parked excluded')
  })

  it('keeps the empty-state copy honest per source — degraded never claims "connected"', () => {
    expect(boardSrc).toContain('Pipeline source degraded — opportunity data unavailable.')
    // The "connected" line must be the connected-empty branch, gated on source,
    // not the unconditional fallback for every empty render.
    expect(boardSrc).toMatch(
      /source === 'degraded'\s*\?\s*'Pipeline source degraded[\s\S]*?The pipeline is connected but holds no open opportunities/,
    )
  })

  it('keeps cockpit section headers readable on the deck ground (deck tokens with off-deck fallback)', () => {
    // HubStatusWidget / CoachBriefs headers sit directly on the #0e1014 deck
    // (outside their light cards, outside canvasScope). They must read the
    // deck tokens (17.11:1 / 8.60:1 on the canvas) and fall back to their
    // original colours anywhere else.
    expect(hubSrc).toContain('var(--deck-text, var(--color-text-primary))')
    expect(hubSrc).toContain('var(--deck-muted, var(--color-text-muted))')
    expect(hubSrc).toContain('var(--deck-muted, var(--color-text-disabled))')
    expect(coachSrc).toContain('var(--deck-text, #52525b)')
    expect(coachSrc).toContain('var(--deck-muted, var(--color-text-muted))')
    // The old dark-on-dark literal class must be gone from the coach header.
    expect(coachSrc).not.toContain('text-[#52525b]')
  })

  it('re-points the app-global muted ink inside canvas scope (tiles imported unchanged)', () => {
    // --color-text-muted is #5f5f66 app-wide (~2.4:1 on --surface-2); tiles
    // that use it (ActionQueue error, Blocked Lanes, In-Progress PRs) now sit
    // in canvas glass, so the scope resolves it to --ink-dim (7.18:1).
    const scopeBlock = shellCss.match(/\.canvasScope \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(scopeBlock).toContain('--color-text-muted: var(--ink-dim)')
  })
})
