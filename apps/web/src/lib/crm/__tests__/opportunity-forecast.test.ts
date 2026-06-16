import { describe, expect, it } from 'vitest'
import {
  buildOpportunityForecast,
  type CrmOpportunityForecastRow,
} from '@/lib/crm/opportunity-forecast'

function row(overrides: Partial<CrmOpportunityForecastRow> = {}): CrmOpportunityForecastRow {
  return {
    id: 'opp-1',
    name: 'RestoreAssist launch package',
    stage: 'proposal_sent',
    status: 'open',
    value_amount: 10000,
    value_currency: 'AUD',
    probability: 50,
    expected_close_at: '2026-07-15T00:00:00.000Z',
    approval_required: false,
    approval_status: 'not_required',
    ...overrides,
  }
}

describe('buildOpportunityForecast', () => {
  it('calculates weighted and face-value forecast across open opportunities', () => {
    const forecast = buildOpportunityForecast([
      row({ id: 'opp-1', value_amount: 10000, probability: 50 }),
      row({ id: 'opp-2', value_amount: 5000, probability: 80 }),
    ])

    expect(forecast.source).toBe('crm:opportunity-forecast')
    expect(forecast.currency).toBe('AUD')
    expect(forecast.openOpportunityCount).toBe(2)
    expect(forecast.weightedForecast).toBe(9000)
    expect(forecast.faceValue).toBe(15000)
  })

  it('groups forecast by expected close month and currency', () => {
    const forecast = buildOpportunityForecast([
      row({ id: 'opp-1', value_amount: 10000, probability: 50, expected_close_at: '2026-07-15T00:00:00.000Z' }),
      row({ id: 'opp-2', value_amount: 5000, probability: 80, expected_close_at: '2026-08-01T00:00:00.000Z' }),
      row({ id: 'opp-3', value_amount: 500, value_currency: 'NZD', probability: 100, expected_close_at: null }),
    ])

    expect(forecast.buckets).toEqual([
      { month: '2026-07', currency: 'AUD', opportunityCount: 1, weightedValue: 5000, faceValue: 10000 },
      { month: '2026-08', currency: 'AUD', opportunityCount: 1, weightedValue: 4000, faceValue: 5000 },
      { month: 'unscheduled', currency: 'NZD', opportunityCount: 1, weightedValue: 500, faceValue: 500 },
    ])
  })

  it('treats missing or invalid values as zero and clamps probability', () => {
    const forecast = buildOpportunityForecast([
      row({ id: 'opp-1', value_amount: null, probability: 75 }),
      row({ id: 'opp-2', value_amount: '1200', probability: '250' }),
      row({ id: 'opp-3', value_amount: 1000, probability: -20 }),
    ])

    expect(forecast.openOpportunityCount).toBe(3)
    expect(forecast.weightedForecast).toBe(1200)
    expect(forecast.faceValue).toBe(2200)
  })

  it('excludes lost, cancelled, and blocked-review opportunities from the forecast', () => {
    const forecast = buildOpportunityForecast([
      row({ id: 'open', value_amount: 10000, probability: 50 }),
      row({ id: 'lost-status', status: 'lost', value_amount: 100000, probability: 100 }),
      row({ id: 'cancelled-status', status: 'cancelled', value_amount: 100000, probability: 100 }),
      row({ id: 'blocked-stage', stage: 'blocked_review', value_amount: 100000, probability: 100 }),
    ])

    expect(forecast.openOpportunityCount).toBe(1)
    expect(forecast.excludedOpportunityCount).toBe(3)
    expect(forecast.weightedForecast).toBe(5000)
  })

  it('surfaces approval-gated opportunities separately', () => {
    const forecast = buildOpportunityForecast([
      row({
        id: 'approval-required',
        name: 'CCW data merge',
        approval_required: true,
        approval_status: 'requested',
        value_amount: 8000,
        probability: 75,
        next_action: 'Phill approval',
      }),
      row({
        id: 'won-pending',
        name: 'Dimitri client conversion',
        stage: 'won_pending_client_conversion',
        status: 'won',
        value_amount: 12000,
        probability: 100,
      }),
    ])

    expect(forecast.approvalGated).toEqual([
      {
        id: 'won-pending',
        name: 'Dimitri client conversion',
        stage: 'won_pending_client_conversion',
        status: 'won',
        approvalStatus: 'not_required',
        weightedValue: 12000,
        nextAction: null,
      },
      {
        id: 'approval-required',
        name: 'CCW data merge',
        stage: 'proposal_sent',
        status: 'open',
        approvalStatus: 'requested',
        weightedValue: 6000,
        nextAction: 'Phill approval',
      },
    ])
  })
})
