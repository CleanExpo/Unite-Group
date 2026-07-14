// src/app/api/leads/route.ts
// Public website lead capture → crm_leads (UNI-2355), with optional
// capture→enroll into a drip campaign in the same call (UNI-2356).
//
// PUBLIC route (allow-listed in src/proxy.ts, rate-limited there before auth).
// crm_leads has FORCED RLS with founder-only policies and deliberately NO anon
// insert policy — inserts go through the service-role client with founder_id
// set explicitly from FOUNDER_USER_ID (single-tenant doctrine). The service
// role key never reaches the client bundle.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  buildCrmActivityTimelineEvent,
  buildCrmTimelineAgentActionInsert,
} from '@/lib/crm/activity-timeline'

export const dynamic = 'force-dynamic'

type LeadBody = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  message?: string
  interests?: string
  referral_source?: string
  marketing_consent?: boolean
  /** Optional business slug the lead came from (dr, nrpg, carsi, restore, …). */
  business_key?: string
  /** Optional drip campaign to enroll the lead into (capture → enroll in one call). */
  drip_campaign_id?: string
}

type ContactRow = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
}

const MAX_SHORT_FIELD = 256
const MAX_LONG_FIELD = 4000

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Find-or-create the founder's contact for this email, then enroll it in the
 * campaign. Never throws — lead capture must succeed even if enrollment fails.
 */
async function enrollLeadInDrip(
  supabase: ServiceClient,
  founderId: string,
  campaignId: string,
  lead: { email: string; firstName: string; lastName: string | null }
): Promise<{ enrolled: boolean; contactId?: string; reason?: string }> {
  const { data: campaign, error: campaignError } = await supabase
    .from('drip_campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('founder_id', founderId)
    .single()

  if (campaignError || !campaign) return { enrolled: false, reason: 'campaign_not_found' }

  const { data: steps, error: stepsError } = await supabase
    .from('drip_steps')
    .select('id, step_order')
    .eq('campaign_id', campaignId)
    .eq('founder_id', founderId)
    .order('step_order', { ascending: true })

  if (stepsError || !steps || steps.length === 0) {
    return { enrolled: false, reason: 'campaign_has_no_steps' }
  }

  const { data: existingContact, error: contactLookupError } = await supabase
    .from('contacts')
    .select('id, email, first_name, last_name')
    .eq('founder_id', founderId)
    .eq('email', lead.email)
    .maybeSingle()

  if (contactLookupError) return { enrolled: false, reason: 'contact_lookup_failed' }

  let contact = existingContact as ContactRow | null
  if (!contact) {
    const { data: created, error: createError } = await supabase
      .from('contacts')
      .insert({
        founder_id: founderId,
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        status: 'lead',
        tags: [],
        metadata: { source: 'website_form' },
      })
      .select('id, email, first_name, last_name')
      .single()

    if (createError || !created) return { enrolled: false, reason: 'contact_create_failed' }
    contact = created as ContactRow
  }

  const { data: existingEnrollment, error: enrollmentLookupError } = await supabase
    .from('drip_enrollments')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('contact_id', contact.id)
    .eq('founder_id', founderId)
    .maybeSingle()

  if (enrollmentLookupError) {
    return { enrolled: false, contactId: contact.id, reason: 'enrollment_lookup_failed' }
  }
  if (existingEnrollment) {
    return { enrolled: false, contactId: contact.id, reason: 'already_enrolled' }
  }

  const now = new Date().toISOString()
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || null
  const { error: enrollError } = await supabase.from('drip_enrollments').insert({
    founder_id: founderId,
    campaign_id: campaignId,
    contact_id: contact.id,
    email: lead.email,
    name,
    status: 'active',
    current_step_order: 1,
    next_run_at: now,
    enrolled_at: now,
  })

  if (enrollError) {
    console.error('[leads] drip enroll failed:', enrollError.message)
    return { enrolled: false, contactId: contact.id, reason: 'enroll_failed' }
  }

  return { enrolled: true, contactId: contact.id }
}

export async function POST(request: NextRequest) {
  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    console.error('[leads] FOUNDER_USER_ID not configured')
    return NextResponse.json({ error: 'Lead capture unavailable' }, { status: 500 })
  }

  let body: LeadBody
  try {
    body = (await request.json()) as LeadBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const firstName = clean(body.first_name, MAX_SHORT_FIELD)
  if (!firstName) {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  const email = clean(body.email, MAX_SHORT_FIELD)?.toLowerCase() ?? null
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const lastName = clean(body.last_name, MAX_SHORT_FIELD)
  const businessKey = clean(body.business_key, MAX_SHORT_FIELD)
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent')?.slice(0, MAX_SHORT_FIELD) ?? null

  const supabase = createServiceClient()

  const { data: leadRow, error: insertError } = await supabase
    .from('crm_leads')
    .insert({
      founder_id: founderId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: clean(body.phone, MAX_SHORT_FIELD),
      company: clean(body.company, MAX_SHORT_FIELD),
      job_title: clean(body.job_title, MAX_SHORT_FIELD),
      message: clean(body.message, MAX_LONG_FIELD),
      interests: clean(body.interests, MAX_LONG_FIELD),
      referral_source: clean(body.referral_source, MAX_SHORT_FIELD),
      marketing_consent: body.marketing_consent === true,
      source: 'website_form',
      ip_address: ipAddress,
      user_agent: userAgent,
      additional_data: businessKey ? { business_key: businessKey } : {},
    })
    .select('id')
    .single()

  if (insertError || !leadRow) {
    console.error('[leads] insert failed:', insertError?.message)
    return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 })
  }

  const subjectLabel = [firstName, lastName].filter(Boolean).join(' ').trim() || clean(body.company, MAX_SHORT_FIELD) || email
  const timelineEvent = buildCrmActivityTimelineEvent({
    type: 'lead_captured',
    actor: 'website_form',
    subjectId: leadRow.id,
    subjectLabel,
    occurredAt: new Date().toISOString(),
    source: 'api/leads',
    businessSlug: businessKey,
    metadata: {
      marketingConsent: body.marketing_consent === true,
      email,
      phone: clean(body.phone, MAX_SHORT_FIELD),
      ipAddress,
    },
  })
  const timelineInsert = buildCrmTimelineAgentActionInsert(timelineEvent)
  try {
    const { error: timelineError } = await supabase.from('agent_actions').insert(timelineInsert)
    if (timelineError) console.error('[leads] timeline insert failed:', timelineError.message)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[leads] timeline insert failed:', message)
  }

  const dripCampaignId = clean(body.drip_campaign_id, MAX_SHORT_FIELD)
  let drip: Awaited<ReturnType<typeof enrollLeadInDrip>> | undefined
  if (dripCampaignId) {
    drip = await enrollLeadInDrip(supabase, founderId, dripCampaignId, {
      email,
      firstName,
      lastName,
    })
  }

  return NextResponse.json({ id: leadRow.id, ...(drip ? { drip } : {}) }, { status: 201 })
}
