// GET /api/founder/proposals: the founder's proposals and whether each has an order (UNI-3173).
// POST /api/founder/proposals: issue a proposal for a lead. The link token is returned once and only its hash is kept.
// Uses the service client because these tables are not in the generated types until the migration is applied; every
// query is scoped to the founder explicitly.

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sanitiseError } from '@/lib/error-reporting'
import { requireFounder } from '@/lib/proposals/founder-auth'
import { findPlan, PROPOSAL_TERMS_VERSION } from '@/lib/proposals/plans'
import { newProposalToken, sha256Hex } from '@/lib/proposals/tokens'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  leadId: z.string().uuid(),
  planId: z.string().min(1).max(64),
  expiresInDays: z.number().int().min(1).max(90).default(30),
})

export async function GET() {
  const auth = await requireFounder()
  if ('denied' in auth) return auth.denied

  const { data, error } = await createServiceClient()
    .from('website_proposals')
    .select('id, created_at, client_name, client_business, plan_name, amount_cents, price_is_placeholder, expires_at, withdrawn_at, website_orders(source, created_at)')
    .eq('founder_id', auth.founderId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not load proposals') }, { status: 500 })
  return NextResponse.json({ proposals: data })
}

export async function POST(request: Request) {
  const auth = await requireFounder()
  if ('denied' in auth) return auth.denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Choose a lead and a plan' }, { status: 400 })
  const plan = findPlan(parsed.data.planId)
  if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })

  const admin = createServiceClient()
  const { data: lead, error: leadError } = await admin
    .from('crm_leads')
    .select('id, first_name, last_name, company, email')
    .eq('founder_id', auth.founderId)
    .eq('id', parsed.data.leadId)
    .maybeSingle<{ id: string; first_name: string; last_name: string | null; company: string | null; email: string }>()
  if (leadError) return NextResponse.json({ error: sanitiseError(leadError, 'Could not read the lead') }, { status: 500 })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const token = newProposalToken()
  const { data: created, error } = await admin
    .from('website_proposals')
    .insert({
      founder_id: auth.founderId,
      lead_id: lead.id,
      token_hash: sha256Hex(token),
      client_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
      client_business: lead.company,
      client_email: lead.email,
      plan_id: plan.id,
      plan_name: plan.name,
      scope: plan.scope,
      amount_cents: plan.amountCents,
      billing_interval: plan.interval,
      price_is_placeholder: plan.isPlaceholder,
      terms_version: PROPOSAL_TERMS_VERSION,
      expires_at: new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not create the proposal') }, { status: 500 })

  return NextResponse.json({ id: created.id, path: `/proposal/${token}` }, { status: 201 })
}
