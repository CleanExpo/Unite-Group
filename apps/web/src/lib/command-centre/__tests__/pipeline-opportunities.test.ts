// src/lib/command-centre/__tests__/pipeline-opportunities.test.ts
//
// UNI-2339 slice 2 — stage rollup for the read-only PipelineBoard revival.
// Pins the crm_opportunities → board-column mapping so a DB stage-vocabulary
// change can never silently invent or drop board columns.

import { describe, expect, it } from 'vitest'
import { STAGE_ROLLUP, mapOpportunityRows } from '../pipeline-opportunities'
import { PIPELINE_STAGES } from '@/components/command-centre/pipeline/PipelineBoard'
import type { Tables } from '@/types/database'

type Row = Tables<'crm_opportunities'>

function row(overrides: Partial<Row>): Row {
  return {
    additional_data: {},
    approval_required: false,
    approval_status: 'not_required',
    campaign_medium: null,
    campaign_name: null,
    campaign_source: null,
    created_at: '2026-07-01T00:00:00.000Z',
    decision_needed: null,
    expected_close_at: null,
    founder_id: 'founder-1',
    id: 'opp-1',
    linked_business_id: null,
    linked_client_id: null,
    linked_contact_id: null,
    linked_lead_id: null,
    lost_at: null,
    lost_reason: null,
    name: 'Example deal',
    next_action: null,
    next_action_due_at: null,
    owner: 'phill',
    probability: 40,
    risk: null,
    source: 'manual',
    source_detail: null,
    stage: 'qualified',
    status: 'open',
    updated_at: '2026-07-08T00:00:00.000Z',
    value_amount: 12000,
    value_currency: 'AUD',
    won_at: null,
    ...overrides,
  }
}

describe('pipeline-opportunities — crm_opportunities → PipelineBoard read model', () => {
  it('rolls every working DB stage up to one of the board’s five columns', () => {
    expect(STAGE_ROLLUP).toEqual({
      new_signal: 'lead',
      qualified: 'qualified',
      discovery: 'qualified',
      proposal_needed: 'proposal',
      proposal_sent: 'proposal',
      negotiation: 'negotiation',
      decision_needed: 'negotiation',
      won_pending_client_conversion: 'won',
      won_converted: 'won',
    })
    for (const target of Object.values(STAGE_ROLLUP)) {
      expect(PIPELINE_STAGES).toContain(target)
    }
  })

  it('drops rows in terminal/parked stages instead of inventing a column', () => {
    const rows = [
      row({ id: 'a', stage: 'new_signal' }),
      row({ id: 'b', stage: 'lost', status: 'lost' }),
      row({ id: 'c', stage: 'paused', status: 'paused' }),
      row({ id: 'd', stage: 'blocked_review', status: 'blocked_review' }),
    ]
    const { opportunities: mapped } = mapOpportunityRows(rows)
    expect(mapped.map((o) => o.id)).toEqual(['a'])
    expect(mapped[0].stage).toBe('lead')
  })

  it('reports honest counts for the rollup drop — never a silent under-report (RA-1109)', () => {
    // One lost row among two → totalFetched 2, excludedCount 1.
    const { opportunities, totalFetched, excludedCount } = mapOpportunityRows([
      row({ id: 'a', stage: 'qualified' }),
      row({ id: 'b', stage: 'lost', status: 'lost' }),
    ])
    expect(opportunities).toHaveLength(1)
    expect(totalFetched).toBe(2)
    expect(excludedCount).toBe(1)

    // Nothing dropped → excludedCount 0 (the page only surfaces it when > 0).
    const clean = mapOpportunityRows([row({ id: 'a', stage: 'qualified' })])
    expect(clean.totalFetched).toBe(1)
    expect(clean.excludedCount).toBe(0)

    // Empty read stays honest too.
    const empty = mapOpportunityRows([])
    expect(empty.totalFetched).toBe(0)
    expect(empty.excludedCount).toBe(0)
  })

  it('maps row fields onto the board contract without fabricating values', () => {
    const {
      opportunities: [opp],
    } = mapOpportunityRows([
      row({ id: 'x', name: 'CCW rollout', stage: 'proposal_sent', value_amount: null, probability: null }),
    ])
    expect(opp).toEqual({
      id: 'x',
      company: 'CCW rollout',
      valueAud: 0,
      stage: 'proposal',
      probability: 0,
      lastActivityAt: '2026-07-08T00:00:00.000Z',
    })
  })
})
