import { MissionControlShell } from '../MissionControlShell'
import { SixZoneCanvas } from './SixZoneCanvas'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'


export interface SixZoneViewProps { work: React.ComponentProps<typeof SixZoneCanvas>['work']; className?: string }

export function SixZoneView({ work, className }: SixZoneViewProps) {
  return (
    // Font variables match every sibling deck; without them --font-jbmono /
    // --font-chakra / --font-syne are unset here and the deck chrome falls back.
    <MissionControlShell section="six-zone" title="System overview" className={className}>

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
        <SixZoneCanvas work={work} />
      </section>
    </MissionControlShell>
  )
}
