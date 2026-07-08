'use client'

// PipelineBoard — read-only, approval-gated pipeline for the CRM Control Panel.
//
// spec.md §8: pipeline V1 is READ. A card click opens the opportunity; stage
// change is approval-gated (routed through the Approval Queue), never a free
// drag. A deal untouched for > STALE_DAYS wears the single Candy-Red signal.
//
// Presentational by construction. The `crm_opportunities` migration is not yet
// applied, so this component owns no fetch — it renders exactly the typed props
// it is handed and, when handed nothing, says so honestly (No-Invaders: no
// fake-as-real data, provenance always visible via <SourceBadge>).
//
// Register: Gun Metal + Candy Red glassmorphic (pipeline-board.module.css),
// matching docs/design/crm-control-panel.html.

import * as React from 'react'

import { SourceBadge, type SourceMode } from '@/components/command-centre/SourceBadge'

import styles from './pipeline-board.module.css'

/** Ordered CRM stages. Matches the design canvas board columns. */
export const PIPELINE_STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

const STAGE_LABEL: Record<PipelineStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
}

/** A deal untouched for longer than this wears the Candy-Red stale signal. */
export const STALE_DAYS = 7

export interface Opportunity {
  id: string
  /** Company / account name. */
  company: string
  /** Deal value in AUD (whole dollars). */
  valueAud: number
  stage: PipelineStage
  /** 0–100 win probability. Drives the progress bar width. */
  probability: number
  /** ISO timestamp of the last stage/field change. Drives staleness. */
  lastActivityAt: string
}

export interface PipelineBoardProps {
  opportunities: Opportunity[]
  /** Provenance of `opportunities`. Rendered honestly via <SourceBadge>. */
  source: SourceMode
  /** Short source label, e.g. "crm_opportunities" or "seed v1". */
  sourceLabel?: string
  /** ISO timestamp of the last data refresh (shown only when source is live). */
  lastUpdatedAt?: string
  /** Opening an opportunity. Read action only — never mutates stage here. */
  onSelectOpportunity?: (id: string) => void
}

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

function isStale(iso: string, now: number): boolean {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return false
  return now - parsed > STALE_DAYS * 86_400_000
}

function daysSince(iso: string, now: number): number {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.round((now - parsed) / 86_400_000))
}

export function PipelineBoard({
  opportunities,
  source,
  sourceLabel = 'crm_opportunities',
  lastUpdatedAt,
  onSelectOpportunity,
}: PipelineBoardProps) {
  // Stable "now" for the render pass so staleness is consistent across columns.
  const now = React.useMemo(() => Date.now(), [])

  const byStage = React.useMemo(() => {
    const groups: Record<PipelineStage, Opportunity[]> = {
      lead: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
    }
    for (const opp of opportunities) {
      // Ignore rows with an unknown stage rather than inventing a column.
      if (groups[opp.stage]) groups[opp.stage].push(opp)
    }
    return groups
  }, [opportunities])

  const isEmpty = opportunities.length === 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Pipeline</h2>
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)",
            fontSize: 12,
            color: 'var(--cc-ink-hush, #6b7686)',
          }}
        >
          read-only · stage change is approval-gated
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <SourceBadge mode={source} label={sourceLabel} lastUpdatedAt={lastUpdatedAt} />
        </span>
      </div>

      <div className={styles.board} data-testid="pipeline-board">
        {isEmpty ? (
          <div className={styles.boardEmpty} data-testid="pipeline-empty">
            <span className={styles.boardEmptyTitle}>No opportunities yet</span>
            <span className={styles.boardEmptyBody}>
              {source === 'loading'
                ? 'Loading pipeline…'
                : 'The pipeline is connected but holds no open opportunities. New deals appear here as they are created.'}
            </span>
          </div>
        ) : (
          PIPELINE_STAGES.map((stage) => {
            const deals = byStage[stage]
            const total = deals.reduce((sum, d) => sum + d.valueAud, 0)
            return (
              <div key={stage} className={styles.stage} data-testid={`pipeline-stage-${stage}`}>
                <div className={styles.stageHead}>
                  <span className={styles.stageName}>{STAGE_LABEL[stage]}</span>
                  <span className={styles.stageCount}>
                    {deals.length} · {AUD.format(total)}
                  </span>
                </div>

                {deals.length === 0 ? (
                  <div className={styles.stageEmpty}>—</div>
                ) : (
                  deals.map((deal) => {
                    const stale = isStale(deal.lastActivityAt, now)
                    const days = daysSince(deal.lastActivityAt, now)
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        className={`${styles.deal} ${stale ? styles.dealStale : ''}`}
                        data-testid={`pipeline-deal-${deal.id}`}
                        data-stale={stale ? 'true' : 'false'}
                        onClick={() => onSelectOpportunity?.(deal.id)}
                      >
                        <div className={styles.co}>{deal.company}</div>
                        <div className={styles.val}>{AUD.format(deal.valueAud)}</div>
                        <div className={styles.prob}>
                          <span
                            className={`${styles.probFill} ${stale ? styles.probFillStale : ''}`}
                            style={{ width: `${Math.min(100, Math.max(0, deal.probability))}%` }}
                          />
                        </div>
                        <div className={styles.meta}>
                          {stale ? (
                            <>
                              <span className={styles.staleDot} aria-hidden />
                              stale {days}d
                            </>
                          ) : (
                            <>
                              {deal.probability}% · {days}d
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
