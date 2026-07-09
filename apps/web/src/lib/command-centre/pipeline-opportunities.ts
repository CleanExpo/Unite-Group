// src/lib/command-centre/pipeline-opportunities.ts
//
// UNI-2339 slice 2 — server-side read model for the revived (read-only)
// PipelineBoard on /founder/command-centre.
//
// Reads the SAME founder-scoped `crm_opportunities` register the existing
// GET /api/founder/opportunities route reads (no new API route — the page is
// a Server Component, so the query runs directly). Maps rows onto the
// board's five presentational columns via an explicit stage rollup.
//
// Honesty rules (NorthStar): a query failure returns source 'degraded' with
// an empty board and the reason — never fabricated deals.

import { createClient, hasSupabaseConfig } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import type { Opportunity, PipelineStage } from '@/components/command-centre/pipeline/PipelineBoard'
import type { SourceMode } from '@/components/command-centre/SourceBadge'

type OpportunityRow = Tables<'crm_opportunities'>

/**
 * crm_opportunities.stage (12-value CHECK constraint) → the board's five
 * columns. Terminal/parked stages (lost, paused, blocked_review) are
 * deliberately absent: the board shows the working pipeline, and
 * PipelineBoard ignores unmapped stages rather than inventing a column.
 */
export const STAGE_ROLLUP: Record<string, PipelineStage> = {
  new_signal: 'lead',
  qualified: 'qualified',
  discovery: 'qualified',
  proposal_needed: 'proposal',
  proposal_sent: 'proposal',
  negotiation: 'negotiation',
  decision_needed: 'negotiation',
  won_pending_client_conversion: 'won',
  won_converted: 'won',
}

export interface PipelineBoardData {
  opportunities: Opportunity[]
  source: SourceMode
  /** ISO timestamp of the read. Only set when source is 'live'. */
  lastUpdatedAt?: string
  /** Why the read degraded (query error / auth missing). */
  error?: string
}

/** Pure mapper: crm_opportunities rows → the board's Opportunity props.
 *  Rows in unmapped (terminal/parked) stages are dropped. */
export function mapOpportunityRows(rows: OpportunityRow[]): Opportunity[] {
  const mapped: Opportunity[] = []
  for (const row of rows) {
    const stage = STAGE_ROLLUP[row.stage]
    if (!stage) continue
    mapped.push({
      id: row.id,
      company: row.name,
      valueAud: Number(row.value_amount ?? 0),
      stage,
      probability: row.probability ?? 0,
      lastActivityAt: row.updated_at,
    })
  }
  return mapped
}

/** Founder-scoped pipeline read. Mirrors /api/founder/opportunities:
 *  founder_id filter, newest first, 500-row cap. */
export async function loadPipelineOpportunities(founderId: string | null): Promise<PipelineBoardData> {
  if (!founderId) {
    return { opportunities: [], source: 'degraded', error: 'no_founder_session' }
  }
  if (!hasSupabaseConfig()) {
    return { opportunities: [], source: 'degraded', error: 'supabase_not_configured' }
  }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('crm_opportunities')
      .select('*')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return {
      opportunities: mapOpportunityRows((data ?? []) as OpportunityRow[]),
      source: 'live',
      lastUpdatedAt: new Date().toISOString(),
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { opportunities: [], source: 'degraded', error: reason }
  }
}
