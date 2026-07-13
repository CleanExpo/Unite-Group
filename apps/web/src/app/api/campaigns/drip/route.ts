// src/app/api/campaigns/drip/route.ts
// Founder-scoped drip lifecycle backed by dedicated drip_* tables.

import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { processCampaignDrip } from '@/lib/campaigns/drip-processor'

export const dynamic = 'force-dynamic'

type JsonObject = Record<string, unknown>

type DripCampaignRow = {
  id: string
  founder_id: string
  business_key: string
  name: string
  subject: string
  body_html: string
  body_text: string | null
  status: string
  source: string
  metadata: unknown
  created_at: string
  updated_at: string
}

type DripStepRow = {
  id: string
  founder_id: string
  campaign_id: string
  step_order: number
  subject: string
  body_html: string
  body_text: string | null
  delay_minutes: number
  created_at: string
}

type DripEnrollmentRow = {
  id: string
  founder_id: string
  campaign_id: string
  contact_id: string
  email: string
  name: string | null
  status: 'active' | 'completed' | 'paused' | 'failed' | 'cancelled'
  current_step_order: number
  next_run_at: string
  enrolled_at: string
  completed_at: string | null
}

type ContactRow = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
}

type CreateCampaignBody = {
  action: 'create_campaign'
  businessKey?: string
  name?: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
}

type AddStepBody = {
  action: 'add_step'
  campaignId?: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
  delayMinutes?: number
}

type EnrollBody = {
  action: 'enroll_contact'
  campaignId?: string
  contactId?: string
}

type ProcessBody = {
  action: 'process_pending'
  campaignId?: string
  dryRun?: boolean
}

type SetStatusBody = {
  action: 'set_status'
  campaignId?: string
  status?: string
}

type DripBody = CreateCampaignBody | AddStepBody | EnrollBody | ProcessBody | SetStatusBody
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function required(value: string | undefined, name: string): string | NextResponse {
  if (!value?.trim()) {
    return NextResponse.json({ error: `${name} is required` }, { status: 400 })
  }
  return value.trim()
}

function contactName(contact: ContactRow): string | null {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
  return name || null
}

function campaignPayload(campaign: DripCampaignRow) {
  return {
    id: campaign.id,
    founder_id: campaign.founder_id,
    business_key: campaign.business_key,
    name: campaign.name,
    subject: campaign.subject,
    body_html: campaign.body_html,
    body_text: campaign.body_text,
    status: campaign.status,
    source: campaign.source,
    metadata: campaign.metadata,
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
  }
}

function stepPayload(step: DripStepRow) {
  return {
    id: step.id,
    order: step.step_order,
    subject: step.subject,
    bodyHtml: step.body_html,
    bodyText: step.body_text,
    delayMinutes: step.delay_minutes,
    createdAt: step.created_at,
  }
}

function enrollmentPayload(enrollment: DripEnrollmentRow) {
  return {
    id: enrollment.id,
    contactId: enrollment.contact_id,
    email: enrollment.email,
    name: enrollment.name,
    status: enrollment.status,
    currentStepOrder: enrollment.current_step_order,
    nextRunAt: enrollment.next_run_at,
    enrolledAt: enrollment.enrolled_at,
    completedAt: enrollment.completed_at,
  }
}

async function loadCampaign(
  supabase: SupabaseServerClient,
  founderId: string,
  campaignId: string
) {
  const { data, error } = await supabase
    .from('drip_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('founder_id', founderId)
    .single()

  if (error || !data) return null
  return data as DripCampaignRow
}

async function loadSteps(
  supabase: SupabaseServerClient,
  founderId: string,
  campaignId: string
) {
  const { data, error } = await supabase
    .from('drip_steps')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('founder_id', founderId)
    .order('step_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as DripStepRow[]
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: DripBody
  try {
    body = await request.json() as DripBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const supabase = await createClient()

  if (body.action === 'create_campaign') {
    const businessKey = required(body.businessKey, 'businessKey')
    if (businessKey instanceof NextResponse) return businessKey
    const name = required(body.name, 'name')
    if (name instanceof NextResponse) return name
    const subject = required(body.subject, 'subject')
    if (subject instanceof NextResponse) return subject
    const bodyHtml = required(body.bodyHtml, 'bodyHtml')
    if (bodyHtml instanceof NextResponse) return bodyHtml

    const { data, error } = await supabase
      .from('drip_campaigns')
      .insert({
        founder_id: user.id,
        business_key: businessKey,
        name,
        subject,
        body_html: bodyHtml,
        body_text: body.bodyText ?? null,
        status: 'draft',
        source: 'api',
        metadata: { categories: ['drip'] } satisfies JsonObject,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('[campaigns/drip] create failed:', error?.message)
      return NextResponse.json({ error: 'Failed to create drip campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: campaignPayload(data as DripCampaignRow) }, { status: 201 })
  }

  const campaignId = required(body.campaignId, 'campaignId')
  if (campaignId instanceof NextResponse) return campaignId

  const campaign = await loadCampaign(supabase, user.id, campaignId)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (body.action === 'add_step') {
    const subject = required(body.subject, 'subject')
    if (subject instanceof NextResponse) return subject
    const bodyHtml = required(body.bodyHtml, 'bodyHtml')
    if (bodyHtml instanceof NextResponse) return bodyHtml

    const existingSteps = await loadSteps(supabase, user.id, campaign.id)
    const stepOrder = existingSteps.length + 1
    const { data, error } = await supabase
      .from('drip_steps')
      .insert({
        founder_id: user.id,
        campaign_id: campaign.id,
        step_order: stepOrder,
        subject,
        body_html: bodyHtml,
        body_text: body.bodyText ?? null,
        delay_minutes: Math.max(0, body.delayMinutes ?? 0),
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('[campaigns/drip] add step failed:', error?.message)
      return NextResponse.json({ error: 'Failed to add drip step' }, { status: 500 })
    }
    return NextResponse.json({ step: stepPayload(data as DripStepRow), stepCount: stepOrder })
  }

  if (body.action === 'enroll_contact') {
    const contactId = required(body.contactId, 'contactId')
    if (contactId instanceof NextResponse) return contactId

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('id,email,first_name,last_name')
      .eq('id', contactId)
      .eq('founder_id', user.id)
      .single()

    if (error || !contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    const typedContact = contact as ContactRow
    if (!typedContact.email?.trim()) {
      return NextResponse.json({ error: 'Contact has no email address' }, { status: 400 })
    }

    const steps = await loadSteps(supabase, user.id, campaign.id)
    if (steps.length === 0) {
      return NextResponse.json({ error: 'Campaign has no drip steps' }, { status: 400 })
    }

    const { data: existingEnrollment, error: existingError } = await supabase
      .from('drip_enrollments')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('contact_id', typedContact.id)
      .eq('founder_id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('[campaigns/drip] duplicate check failed:', existingError.message)
      return NextResponse.json({ error: 'Failed to enroll contact' }, { status: 500 })
    }
    if (existingEnrollment) return NextResponse.json({ error: 'Contact is already enrolled' }, { status: 409 })

    const now = new Date().toISOString()
    const { data: enrollment, error: enrollError } = await supabase
      .from('drip_enrollments')
      .insert({
        founder_id: user.id,
        campaign_id: campaign.id,
        contact_id: typedContact.id,
        email: typedContact.email.trim(),
        name: contactName(typedContact),
        status: 'active',
        current_step_order: 1,
        next_run_at: now,
        enrolled_at: now,
      })
      .select('*')
      .single()

    if (enrollError || !enrollment) {
      console.error('[campaigns/drip] enroll failed:', enrollError?.message)
      return NextResponse.json({ error: 'Failed to enroll contact' }, { status: 500 })
    }

    return NextResponse.json({ enrollment: enrollmentPayload(enrollment as DripEnrollmentRow) })
  }

  if (body.action === 'set_status') {
    const validStatuses = ['draft', 'active', 'paused', 'archived']
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('drip_campaigns')
      .update({ status: body.status })
      .eq('id', campaign.id)
      .eq('founder_id', user.id)
      .select('*')
      .single()

    if (error || !data) {
      console.error('[campaigns/drip] set status failed:', error?.message)
      return NextResponse.json({ error: 'Failed to update campaign status' }, { status: 500 })
    }
    return NextResponse.json({ campaign: campaignPayload(data as DripCampaignRow) })
  }

  if (body.action === 'process_pending') {
    const dryRun = body.dryRun !== false

    try {
      const result = await processCampaignDrip({
        supabase,
        founderId: user.id,
        campaignId: campaign.id,
        businessKey: campaign.business_key,
        dryRun,
      })
      return NextResponse.json({ result })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[campaigns/drip] load pending failed:', message)
      return NextResponse.json({ error: 'Failed to process pending drip steps' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: `Unsupported action: ${(body as { action: string }).action}` }, { status: 400 })
}
