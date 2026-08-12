// src/app/(founder)/founder/command-centre/six-zone/page.tsx
//
// Canvas deck — the six-zone canvas. One live zone (local host status) and five
// signposts into decks that already exist. Deck register mirrors the sibling
// sub-routes (fonts + styles.deck + shell glass tokens); auth is enforced by the
// (founder) layout, and the status route it polls enforces auth again server-side.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { DeckThemeShell } from '../DeckThemeShell'
import { SixZoneCanvas } from './SixZoneCanvas'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'
import { loadActionQueueData } from '../ActionQueueTile'
import { loadBlockedLanesData } from '../BlockedLanesTile'
import { findColumnIndex } from '@/lib/command-centre/markdown'

export default async function SixZoneCanvasPage() {
  const [queue, blocked] = await Promise.all([loadActionQueueData(), loadBlockedLanesData()])
  const actionIndex = findColumnIndex(queue.headers, 'action')
  const nextAction = actionIndex >= 0 ? (queue.rows[0]?.[actionIndex] ?? null) : null
  return (
    <DeckThemeShell className={styles.deck}>
      <Link href="/founder/command-centre" className={styles.plink}>
        &larr; Command deck
      </Link>

      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="six-zone">
        <h2>Canvas</h2>
        <span className={shell.glassSub}>six zones · one live host reading · five links to existing decks</span>
        <span className={shell.glassCaption}>
          Zone 1 polls the local host status route every 15s and shows only what that route reports — explicit
          ready / degraded / unknown per signal, with the observation&rsquo;s freshness. Zones 2&ndash;6 carry no
          new data of their own; Operations carries the existing Linear-backed queue and blocker receipt. The other
          zones link to their source decks: Evidence, Agent fleet, Knowledge and Providers.
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.02s' }}
      >
        <SixZoneCanvas
          work={{
            queued: queue.total_rows,
            blocked: blocked.blocked_count,
            source: queue.queue_path,
            nextAction,
            error: queue.read_error !== null || blocked.read_error !== null,
          }}
        />
      </section>
    </DeckThemeShell>
  )
}
