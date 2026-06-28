// src/app/api/founder/opportunities/route.ts
// GET /api/founder/opportunities
// Revenue-opportunity register (spec B9). Founder-scoped pipeline read from
// crm_opportunities, with a pipeline summary. Forecast-only — not billing truth.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

type Opportunity = Tables<'crm_opportunities'>

export interface OpportunitySummary {
  total: number
  open: number
  won: number
  lost: number
  /** Sum of value_amount (AUD) across open opportunities. */
  openValue: number
  /** Sum of value_amount * probability/100 (AUD) across open opportunities. */
  weightedPipeline: number
}

export interface OpportunitySourceOfTruth {
  crm: 'crm_opportunities'
  billing: 'stripe'
  mode: 'forecast_only'
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[]
  summary: OpportunitySummary
  sourceOfTruth: OpportunitySourceOfTruth
}

const SOURCE_OF_TRUTH: OpportunitySourceOfTruth = {
  crm: 'crm_opportunities',
  billing: 'stripe',
  mode: 'forecast_only',
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('crm_opportunities')
      .select('*')
      .eq('founder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    const opportunities = (data ?? []) as Opportunity[]
    const open = opportunities.filter((o) => o.status === 'open')
    const summary: OpportunitySummary = {
      total: opportunities.length,
      open: open.length,
      won: opportunities.filter((o) => o.status === 'won').length,
      lost: opportunities.filter((o) => o.status === 'lost').length,
      openValue: open.reduce((s, o) => s + Number(o.value_amount ?? 0), 0),
      weightedPipeline: open.reduce(
        (s, o) => s + Number(o.value_amount ?? 0) * ((o.probability ?? 0) / 100),
        0,
      ),
    }

    return NextResponse.json({ opportunities, summary, sourceOfTruth: SOURCE_OF_TRUTH } satisfies OpportunitiesResponse)
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to load opportunities', { route: '/api/founder/opportunities' }) },
      { status: 500 },
    )
  }
}
