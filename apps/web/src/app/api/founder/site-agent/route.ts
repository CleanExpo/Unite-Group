// src/app/api/founder/site-agent/route.ts
// Founder console for the public site agent (UNI-2359 keys, UNI-2917 quota).
//
// GET  — the founder's businesses, site keys, kill-switch controls and today's
//        usage. Each section carries its own status: a failed read is reported
//        as `error`, never as an empty list.
// POST — one of:
//   { action: 'create_site', businessName, businessSlug, allowedOrigins }
//        reuse-or-create the `businesses` row by slug, then mint a site key.
//   { action: 'update_key', id, allowedOrigins?, active? }
//   { action: 'set_controls', enabled?, plan? }
//        kill switch + plan ceiling (lib/site-agent/plan-quota.ts).
//
// Security: founder session (getUser → 401) AND founder allow-list
// (hasPrivateAccess → 403, fail-closed when unconfigured). Every query is
// scoped to user.id. allowed_origins must be non-empty: an empty allow-list
// lets ANY site embed the key and spend the founder's quota.
//
// public_agent_controls has founder select/update policies but no insert
// policy, so the first kill-switch write needs the service role; the row's
// founder_id is always user.id, never client input. Existing tables only.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUser, createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasPrivateAccess, isPrivateAccessConfigured } from '@/lib/auth/private-access'
import { sanitiseError } from '@/lib/error-reporting'
import { generateSiteKey } from '@/lib/site-agent/site-keys'
import { chatDailyPerKeyForPlan, SITE_AGENT_PLANS } from '@/lib/site-agent/plan-quota'
import { brisbaneDay } from '@/lib/site-agent/quota'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' } as const
const ROUTE = '/api/founder/site-agent'

const KEY_COLUMNS = 'id, business_key, publishable_key, allowed_origins, active, created_at'
const CONTROL_COLUMNS =
  'enabled, chat_daily_per_key, chat_daily_per_founder, voice_daily_per_key, voice_daily_per_founder, updated_at'

type Section<T> = { status: 'ok'; data: T } | { status: 'error'; error: string }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const originSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value, ctx) => {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      ctx.addIssue({ code: 'custom', message: `Not a URL: ${value}` })
      return z.NEVER
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      ctx.addIssue({ code: 'custom', message: `Origin must be http(s): ${value}` })
      return z.NEVER
    }
    return url.origin.toLowerCase()
  })

const originsSchema = z
  .array(originSchema)
  .min(1, 'At least one allowed origin is required')
  .max(20)
  .transform((origins) => [...new Set(origins)])

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_site'),
    businessName: z.string().trim().min(1).max(200),
    businessSlug: z
      .string()
      .trim()
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, digits and hyphens'),
    allowedOrigins: originsSchema,
  }),
  z.object({
    action: z.literal('update_key'),
    id: z.string().uuid(),
    allowedOrigins: originsSchema.optional(),
    active: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('set_controls'),
    enabled: z.boolean().optional(),
    plan: z.enum(SITE_AGENT_PLANS).optional(),
  }),
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FounderUser = { id: string; email?: string }

async function authorise(): Promise<{ user: FounderUser } | { response: NextResponse }> {
  const user = await getUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE }) }
  }
  if (!isPrivateAccessConfigured() || !hasPrivateAccess({ id: user.id, email: user.email })) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE }) }
  }
  return { user }
}

function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ error, ...(details ? { details } : {}) }, { status: 400, headers: NO_STORE })
}

function serverError(err: unknown, message: string) {
  return NextResponse.json(
    { error: sanitiseError(err, message, { route: ROUTE }) },
    { status: 500, headers: NO_STORE },
  )
}

async function readSection<T>(
  query: PromiseLike<{ data: unknown; error: unknown }>,
  label: string,
): Promise<Section<T>> {
  try {
    const { data, error } = await query
    if (error) throw error
    return { status: 'ok', data: data as T }
  } catch (err) {
    return { status: 'error', error: sanitiseError(err, `${label} unavailable`, { route: ROUTE }) }
  }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET() {
  const auth = await authorise()
  if ('response' in auth) return auth.response
  const founderId = auth.user.id

  const supabase = (await createClient()) as unknown as SupabaseClient
  const day = brisbaneDay()

  const [businesses, keys, controls, usage] = await Promise.all([
    readSection(
      supabase.from('businesses').select('id, name, slug, status').eq('founder_id', founderId).order('name'),
      'Businesses',
    ),
    readSection(
      supabase
        .from('site_keys')
        .select(KEY_COLUMNS)
        .eq('founder_id', founderId)
        .order('created_at', { ascending: false }),
      'Site keys',
    ),
    // data null = no controls row = the agent is paused (the quota RPC treats
    // an absent row as closed).
    readSection(
      supabase.from('public_agent_controls').select(CONTROL_COLUMNS).eq('founder_id', founderId).maybeSingle(),
      'Kill switch',
    ),
    readSection(
      supabase
        .from('public_agent_usage_daily')
        .select('scope, kind, count')
        .eq('founder_id', founderId)
        .eq('day', day),
      'Usage',
    ),
  ])

  return NextResponse.json({ day, businesses, keys, controls, usage }, { headers: NO_STORE })
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const auth = await authorise()
  if ('response' in auth) return auth.response
  const founderId = auth.user.id

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = actionSchema.safeParse(raw)
  if (!parsed.success) return badRequest('Invalid site-agent action', parsed.error.flatten())
  const input = parsed.data

  try {
    if (input.action === 'create_site') {
      const supabase = (await createClient()) as unknown as SupabaseClient

      const { data: existing, error: lookupError } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('founder_id', founderId)
        .eq('slug', input.businessSlug)
        .maybeSingle()
      if (lookupError) throw lookupError

      if (!existing) {
        const { error: createError } = await supabase
          .from('businesses')
          .insert({ founder_id: founderId, name: input.businessName, slug: input.businessSlug })
          .select('id')
          .single()
        if (createError) throw createError
      }

      const { data: key, error: keyError } = await supabase
        .from('site_keys')
        .insert({
          founder_id: founderId,
          business_key: input.businessSlug,
          publishable_key: generateSiteKey(),
          allowed_origins: input.allowedOrigins,
        })
        .select(KEY_COLUMNS)
        .single()
      if (keyError || !key) throw keyError ?? new Error('site key insert returned no row')

      return NextResponse.json({ key, businessCreated: !existing }, { status: 201, headers: NO_STORE })
    }

    if (input.action === 'update_key') {
      if (input.allowedOrigins === undefined && input.active === undefined) {
        return badRequest('Nothing to update')
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.allowedOrigins !== undefined) patch.allowed_origins = input.allowedOrigins
      if (input.active !== undefined) patch.active = input.active

      const supabase = (await createClient()) as unknown as SupabaseClient
      const { data: key, error } = await supabase
        .from('site_keys')
        .update(patch)
        .eq('founder_id', founderId)
        .eq('id', input.id)
        .select(KEY_COLUMNS)
        .maybeSingle()
      if (error) throw error
      if (!key) {
        return NextResponse.json({ error: 'Site key not found' }, { status: 404, headers: NO_STORE })
      }
      return NextResponse.json({ key }, { headers: NO_STORE })
    }

    // set_controls
    if (input.enabled === undefined && input.plan === undefined) {
      return badRequest('Nothing to update')
    }
    const row: Record<string, unknown> = { founder_id: founderId, updated_at: new Date().toISOString() }
    if (input.enabled !== undefined) row.enabled = input.enabled
    if (input.plan !== undefined) {
      const quota = chatDailyPerKeyForPlan(input.plan)
      if (!quota.ok) return badRequest(`Plan "${input.plan}" has no chat ceiling set (${quota.reason})`)
      row.chat_daily_per_key = quota.chatDailyPerKey
    }

    const service = createServiceClient()
    const { data: controls, error } = await service
      .from('public_agent_controls')
      .upsert(row, { onConflict: 'founder_id' })
      .select(CONTROL_COLUMNS)
      .single()
    if (error || !controls) throw error ?? new Error('controls upsert returned no row')
    return NextResponse.json({ controls }, { headers: NO_STORE })
  } catch (err) {
    return serverError(err, 'Site-agent update failed')
  }
}
