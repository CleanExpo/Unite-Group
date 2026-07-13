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

export interface OpportunityReadiness {
  queueWindow: 'latest_500_created_at'
  pagination: 'cursor_by_created_at'
  latestOpportunityUpdatedAt: string | null
  nextCursor: string | null
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[]
  summary: OpportunitySummary
  sourceOfTruth: OpportunitySourceOfTruth
  readiness: OpportunityReadiness
}

const SOURCE_OF_TRUTH: OpportunitySourceOfTruth = {
  crm: 'crm_opportunities',
  billing: 'stripe',
  mode: 'forecast_only',
}

const READINESS: OpportunityReadiness = {
  queueWindow: 'latest_500_created_at',
  pagination: 'cursor_by_created_at',
  latestOpportunityUpdatedAt: null,
  nextCursor: null,
}

const PAGE_LIMIT = 500

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

function latestOpportunityUpdatedAt(opportunities: Opportunity[]): string | null {
  return opportunities.reduce<string | null>((latest, opportunity) => {
    if (!opportunity.updated_at || Number.isNaN(Date.parse(opportunity.updated_at))) return latest
    if (!latest) return opportunity.updated_at
    return Date.parse(opportunity.updated_at) > Date.parse(latest) ? opportunity.updated_at : latest
  }, null)
}

function nextCursor(opportunities: Opportunity[]): string | null {
  if (opportunities.length < PAGE_LIMIT) return null
  const createdAt = opportunities[opportunities.length - 1]?.created_at
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) return null
  return createdAt
}

function beforeCursor(request: Request | undefined): string | null {
  if (!request) return null
  const before = new URL(request.url).searchParams.get('before')
  if (!before) return null
  if (Number.isNaN(Date.parse(before))) return 'INVALID'
  return before
}

export async function GET(request?: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE_HEADERS })

  const before = beforeCursor(request)
  if (before === 'INVALID') {
    return NextResponse.json({ error: 'Invalid before cursor' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    const supabase = await createClient()
    let query = supabase
      .from('crm_opportunities')
      .select('*')
      .eq('founder_id', user.id)

    if (before) query = query.lt('created_at', before)

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT)

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

    return NextResponse.json(
      {
        opportunities,
        summary,
        sourceOfTruth: SOURCE_OF_TRUTH,
        readiness: {
          ...READINESS,
          latestOpportunityUpdatedAt: latestOpportunityUpdatedAt(opportunities),
          nextCursor: nextCursor(opportunities),
        },
      } satisfies OpportunitiesResponse,
      { headers: NO_STORE_HEADERS },
    )
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to load opportunities', { route: '/api/founder/opportunities' }) },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
