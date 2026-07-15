// src/app/(founder)/founder/command-centre/page.tsx
//
// Nexus Command Deck — calm cockpit (UNI-2378 wave 1). Agent-first home:
// the founder's repeated ask is a clean main page with the AI doing the
// work (pattern: assistant-first home — Cleo, docs/design/mobbin-ui-library.md,
// pattern only, never pixels). The dense tiles RELOCATED wholesale to four
// sub-routes (operations / portfolio / providers / knowledge); no tile
// component changed. The main page keeps only: palette + status strip,
// hero band, the Command Brief (digest + idea console), one Vital Signs
// row of nav cards, and the 1-2-3 guided steps.
// Auth enforced by the (founder) layout.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Chakra_Petch, Syne, JetBrains_Mono } from 'next/font/google'
import { getProjects } from '@/lib/command-centre/registry'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { loadActionQueueData } from './ActionQueueTile'
import { loadBlockedLanesData } from './BlockedLanesTile'
import { LiveClock } from './LiveClock'
import { CommandPalette } from './CommandPalette'
import { IdeaConsole } from './IdeaConsole'
import { DigestBanner } from './DigestBanner'
import { CommandSteps } from './CommandSteps'
import { HeroBand } from './HeroBand'
import { DeckThemeShell } from './DeckThemeShell'
import shell from './shell.module.css'
// Vital Signs sources — all data below is already computed for the strip /
// palette / hero (No-Invaders: no invented numbers, no new fetches).
import { BUSINESSES } from '@/lib/businesses'
import { loadPipelineOpportunities } from '@/lib/command-centre/pipeline-opportunities'
import { getUser } from '@/lib/supabase/server'
import styles from './command-deck.module.css'

const chakra = Chakra_Petch({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-chakra',
  display: 'swap',
})

// UNI-2339 slice 1 — canvas register typography (Syne display + JetBrains
// Mono data/KPIs), scoped to this route via CSS variables consumed only by
// shell.module.css.
const syne = Syne({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})
const jbMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
})

// The four relocated decks (UNI-2378). Rendered as the compact deck nav next
// to the status strip AND echoed by the Vital Signs cards below.
const DECK_ROUTES = [
  { href: '/founder/command-centre/operations', label: 'Operations' },
  { href: '/founder/command-centre/portfolio', label: 'Portfolio' },
  { href: '/founder/command-centre/providers', label: 'Providers' },
  { href: '/founder/command-centre/knowledge', label: 'Knowledge' },
] as const

export default async function CommandDeckPage() {
  const projects = await getProjects()
  const [tools, actionQueue, blockedLanes, user] = await Promise.all([
    getToolCatalogue(),
    loadActionQueueData(),
    loadBlockedLanesData(),
    getUser(),
  ])
  const integrationStatuses = await loadProjectIntegrationStatuses(projects)
  // Needs user.id from the batch above, so it runs after. Degrades honestly
  // (empty board + 'degraded' badge) when the session or query is unavailable.
  const pipeline = await loadPipelineOpportunities(user?.id ?? null)

  const activeCount = projects.filter((p) => p.status === 'active').length
  const sources = tools.reduce<Record<string, number>>((acc, t) => {
    acc[t.source] = (acc[t.source] ?? 0) + 1
    return acc
  }, {})
  const pad2 = (n: number) => String(n).padStart(2, '0')
  // Deck state: degraded if any integration manifest failed to load, otherwise ready.
  const degradedManifests = integrationStatuses.filter((s) => !s.ok).length
  const okManifests = integrationStatuses.length - degradedManifests
  const hasDegradedManifest = degradedManifests > 0
  const deckState = hasDegradedManifest ? 'stub' : 'active'
  const deckLabel = hasDegradedManifest ? 'Some manifests degraded' : 'Deck loaded'

  return (
    <DeckThemeShell className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.deck}`}>
      <CommandPalette
        projects={projects.map((p) => ({ name: p.name, status: p.status, production_url: p.production_url }))}
        tools={tools.map((t) => ({ tool_key: t.tool_key, source: t.source, risk_class: t.risk_class }))}
      />

      {/* ── Canvas shell hero band (UNI-2339 slice 1) ─────────────────── */}
      <HeroBand data={actionQueue} />

      {/* ── Status strip ─────────────────────────────────────────────── */}
      <header className={`${styles.statusStrip} ${styles.reveal}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>NX</span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>Nexus Command</span>
            <span className={styles.brandSub}>Unite-Group // Command Deck</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LiveClock className={styles.clock} />
          <span className={styles.clockLabel}>Mission Time · AEST</span>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{pad2(projects.length)}</span>
            <span className={styles.metricLabel}>Projects</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue} data-tone="go">{pad2(activeCount)}</span>
            <span className={styles.metricLabel}>Active</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{pad2(tools.length)}</span>
            <span className={styles.metricLabel}>Tools</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{pad2(Object.keys(sources).length)}</span>
            <span className={styles.metricLabel}>Sources</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <span className={styles.sys}>
            <span className={styles.led} data-state={deckState} />
            <span className={styles.sysText}>{deckLabel}</span>
          </span>
          <span className={styles.kbd}>
            <b>⌘K</b> command palette
          </span>
        </div>
      </header>

      {/* ── Compact deck nav (UNI-2378) — the four relocated decks ───── */}
      <nav className={styles.reveal} aria-label="Command deck sections" data-testid="deck-nav">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.75rem 0 0' }}>
          {DECK_ROUTES.map((route) => (
            <Link key={route.href} href={route.href} className={styles.kbd} style={{ textDecoration: 'none' }}>
              <b>▸</b> {route.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Command Brief — the AI-works-here centrepiece (UNI-2378) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="command-brief">
        <h2>Command Brief</h2>
        <span className={shell.glassSub}>digest + idea intake · idea → board → queue</span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.01s' }}>
        <DigestBanner />
      </section>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.02s' }}>
        <IdeaConsole projects={projects.map((p) => ({ name: p.name }))} />
      </section>

      {/* ── Vital Signs (UNI-2378) — 5 compact nav cards, counts sourced
          only from data this page already loads (No-Invaders: no invented
          numbers, no new fetches). Detail lives on the linked sub-routes.
          The `portfolio` / `capability-bus` ids keep the (unchanged) ⌘K
          palette jump targets resolving — they now land on the nav card
          that links through to the relocated section. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="vital-signs">
        <h2>Vital Signs</h2>
        <span className={shell.glassSub}>one row · detail lives on each deck</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.03s' }}
      >
        <div className={shell.launchGrid}>
          <Link
            href="/founder/command-centre/operations"
            className={shell.launchTile}
            style={{ '--swatch': '#34d399', textDecoration: 'none' } as React.CSSProperties}
            data-testid="vital-operations"
          >
            <span className={shell.launchName}>Operations</span>
            <span className={shell.launchMeta}>
              {actionQueue.total_rows} actions queued · {blockedLanes.blocked_count} of {blockedLanes.total_lanes} lanes blocked
            </span>
            <span className={shell.launchLink}>↗ operations deck</span>
          </Link>

          <Link
            href="/founder/command-centre/portfolio"
            className={shell.launchTile}
            style={{ '--swatch': '#16a34a', textDecoration: 'none' } as React.CSSProperties}
            id="portfolio"
            data-testid="vital-portfolio"
          >
            <span className={shell.launchName}>Portfolio</span>
            <span className={shell.launchMeta}>
              {BUSINESSES.length} businesses · {pipeline.opportunities.length} open opportunities
            </span>
            <span className={shell.launchLink}>↗ portfolio deck</span>
          </Link>

          <Link
            href="/founder/command-centre/providers"
            className={shell.launchTile}
            style={{ '--swatch': '#f97316', textDecoration: 'none' } as React.CSSProperties}
            data-testid="vital-providers"
          >
            <span className={shell.launchName}>Providers</span>
            <span className={shell.launchMeta}>
              {okManifests} manifests ok · {degradedManifests} degraded
            </span>
            <span className={shell.launchLink}>↗ providers deck</span>
          </Link>

          <Link
            href="/founder/command-centre/knowledge"
            className={shell.launchTile}
            style={{ '--swatch': '#6366f1', textDecoration: 'none' } as React.CSSProperties}
            id="capability-bus"
            data-testid="vital-knowledge"
          >
            <span className={shell.launchName}>Knowledge</span>
            <span className={shell.launchMeta}>
              wiki knowledge base · {tools.length} tools on the capability bus
            </span>
            <span className={shell.launchLink}>↗ knowledge deck</span>
          </Link>

          {/* Honest static label — no fake liveness. Mesh heartbeats render
              live on the Operations deck (MeshFleetTile), not here. */}
          <Link
            href="/founder/command-centre/operations"
            className={shell.launchTile}
            style={{ '--swatch': '#fbbf24', textDecoration: 'none' } as React.CSSProperties}
            data-testid="vital-machines"
          >
            <span className={shell.launchName}>Machines</span>
            <span className={shell.launchMeta}>mesh + sync status live on Operations</span>
            <span className={shell.launchLink}>↗ operations deck</span>
          </Link>
        </div>
      </section>

      {/* 1-2-3 guided actions close the calm home (founder lead-with-ops). */}
      <CommandSteps />
    </DeckThemeShell>
  )
}
