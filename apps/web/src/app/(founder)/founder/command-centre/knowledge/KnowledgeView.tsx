import type { CommandCentreTool } from '@/lib/command-centre/tools/catalogue'
import { WikiGraphTile } from '@/components/command-centre/wiki-graph/WikiGraphTile'
import { CapabilityRegistryTile } from '@/components/command-centre/capability-registry/CapabilityRegistryTile'
import { DeckDetails, DeckMoreLine, DECK_LIST_CAP } from '@/components/command-centre/DeckDetails'
import { MissionControlShell } from '../MissionControlShell'
import { WikiEnhanceControl } from '../WikiEnhanceControl'
import { railFor } from '../deck-visual-helpers'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'


export interface KnowledgeViewProps { tools: CommandCentreTool[]; catalogueUnavailable?: boolean; className?: string }

export function KnowledgeView({ tools, catalogueUnavailable, className }: KnowledgeViewProps) {
  const sources = tools.reduce<Record<string, number>>((acc, tool) => { acc[tool.source] = (acc[tool.source] ?? 0) + 1; return acc }, {})
  return (
    <MissionControlShell section="knowledge" title="Knowledge" className={className}>

      {/* ── Wiki knowledge base — canvas register (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="wiki-knowledge-base">
        <h2>Wiki Knowledge Base</h2>
        <span className={shell.glassSub}>button → queue → Mac runner → wiki-growth report</span>
        <div className={shell.glassHeadTools}>
          <WikiEnhanceControl />
        </div>
      </div>

      {/* Wiki Graph (UNI-2304) — knowledge-base graph summary + link to full view. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.02s' }}>
        <WikiGraphTile />
      </section>

      {/* ── Capability bus — canvas register (UNI-2339 slice 2) ──────── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="capability-bus">
        <h2>Capability Bus</h2>
        <span className={shell.glassSub}>{catalogueUnavailable ? 'Tool catalogue unavailable in this environment' : `${tools.length} tools · ${Object.keys(sources).length} sources`}</span>
      </div>

      {/*
        Capability registry state (cc_tools / cc_agents) + the founder-initiated
        sync. Sits directly under the bus head because the bus listing above is
        the STATIC catalogue: this tile is what says whether the registry an
        agent actually searches has anything in it.
      */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.03s' }}>
        <CapabilityRegistryTile />
      </section>

      <section className={`${styles.bus} ${styles.reveal}`} style={{ animationDelay: '0.04s' }}>
        <div className={styles.busTop}>
          <div className={styles.sources}>
            {Object.entries(sources).map(([source, count]) => (
              <span key={source} className={styles.sourceChip}>
                {source} <b>{count}</b>
              </span>
            ))}
          </div>
          <span className={styles.stamp}>
            <span className={styles.led} data-state="active" />
            List-only · no execution
          </span>
        </div>

        {/* Founder feedback 14/07/2026 — the raw tool_key dump collapses behind
            the shared DeckDetails disclosure (summary = counts already shown in
            the section head), capped with an honest "+N more". */}
        <DeckDetails
          title="Tool catalogue"
          stats={`${tools.length} tools · list-only`}
          testId="capability-bus-disclosure"
        >
          <div className={styles.toolGrid}>
            {tools.slice(0, DECK_LIST_CAP).map((tool) => (
              <div
                key={tool.tool_key}
                className={styles.toolRow}
                style={{ '--rail': railFor(tool.risk_class) } as React.CSSProperties}
              >
                <div style={{ minWidth: 0 }}>
                  <div className={styles.toolKey}>{tool.tool_key}</div>
                  <div className={styles.toolDesc}>{tool.description}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span className={styles.riskTag}>{tool.risk_class}</span>
                  {tool.approval_required && <span className={styles.approval}>approval</span>}
                </div>
              </div>
            ))}
          </div>
          <DeckMoreLine total={tools.length} shown={Math.min(tools.length, DECK_LIST_CAP)} />
        </DeckDetails>
      </section>
    </MissionControlShell>
  )
}
