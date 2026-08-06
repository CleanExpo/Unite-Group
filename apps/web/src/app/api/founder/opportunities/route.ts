// src/app/api/founder/opportunities/route.ts
// GET /api/founder/opportunities — founder-scoped pipeline read (spec B9).
// POST /api/founder/opportunities — create a forecast opportunity (UNI-2373 P1).
// Forecast-only — not billing truth.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

type Opportunity = Tables<'crm_opportunities'>

const STAGES = [
  'new_signal',
  'qualified',
  'discovery',
  'proposal_needed',
  'proposal_sent',
  'negotiation',
  'decision_needed',
  'won_pending_client_conversion',
  'won_converted',
  'lost',
  'paused',
  'blocked_review',
] as const

const STATUSES = ['open', 'won', 'lost', 'paused', 'blocked_review', 'cancelled'] as const

const createOpportunitySchema = z.object({
  name: z.string().trim().min(1).max(200),
  stage: z.enum(STAGES).optional(),
  status: z.enum(STATUSES).optional(),
  value_amount: z.number().nonnegative().nullable().optional(),
  value_currency: z.string().trim().min(1).max(8).nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  next_action: z.string().trim().max(500).nullable().optional(),
  source: z.string().trim().min(1).max(64).optional(),
  source_detail: z.string().trim().max(500).nullable().optional(),
  owner: z.string().trim().min(1).max(64).optional(),
  linked_lead_id: z.string().uuid().nullable().optional(),
  linked_contact_id: z.string().uuid().nullable().optional(),
})
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

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE_HEADERS })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const parsed = createOpportunitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid opportunity payload', details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const input = parsed.data
  const stage = input.stage ?? 'new_signal'
  const status = input.status ?? 'open'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('crm_opportunities')
      .insert({
        founder_id: user.id,
        name: input.name,
        stage,
        status,
        value_amount: input.value_amount ?? null,
        value_currency: input.value_currency ?? (input.value_amount != null ? 'AUD' : null),
        probability: input.probability ?? null,
        next_action: input.next_action ?? null,
        source: input.source ?? 'manual',
        source_detail: input.source_detail ?? null,
        owner: input.owner ?? 'Margot',
        linked_lead_id: input.linked_lead_id ?? null,
        linked_contact_id: input.linked_contact_id ?? null,
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ opportunity: data as Opportunity }, { status: 201, headers: NO_STORE_HEADERS })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to create opportunity', { route: '/api/founder/opportunities' }) },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
