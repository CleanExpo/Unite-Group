// src/app/api/events/route.ts
// First-party site analytics intake (UNI-3001).
//
// PUBLIC route (allow-listed in src/proxy.ts). site_events has FORCED RLS and no anon
// policy: inserts go through the service-role client only. Privacy contract:
//   - Do Not Track (DNT: 1) and Global Privacy Control (Sec-GPC: 1) are honoured: 204, nothing stored.
//   - Obvious bots are ignored: 204, nothing stored.
//   - Only the pathname (query dropped, except utm_*), the referrer HOST, a random per-tab session id,
//     a coarse device class and the CDN's country code are stored. The IP address and User-Agent are
//     never stored; the IP is used for rate limiting only, as a salted hash held in memory.
//   - Missing service config fails closed with 503 and a log line, never a stack trace.

import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'
import {
  SITE_EVENT_LIMITS,
  SITE_EVENT_TYPES,
  countryFromHeader,
  deviceFromUserAgent,
  isBotUserAgent,
  referrerHost,
  splitPath,
  visitorOptedOut,
} from '@/lib/analytics/site-events'
import { SITE_URL } from '@/lib/public-site'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const optionalText = (max: number) => z.string().max(max).optional()

const EventSchema = z.object({
  event_type: z.enum(SITE_EVENT_TYPES),
  path: z.string().min(1).max(SITE_EVENT_LIMITS.path + 256),
  label: optionalText(SITE_EVENT_LIMITS.label),
  referrer: optionalText(2048),
  utm_source: optionalText(SITE_EVENT_LIMITS.utm),
  utm_medium: optionalText(SITE_EVENT_LIMITS.utm),
  utm_campaign: optionalText(SITE_EVENT_LIMITS.utm),
  session_id: optionalText(SITE_EVENT_LIMITS.sessionId),
})

const BodySchema = z.union([
  EventSchema.transform((event) => [event]),
  z.array(EventSchema).min(1).max(SITE_EVENT_LIMITS.maxBatch),
])

// --- Per-IP rate limit: in memory, salted hash, never the IP itself -----------------------------
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 60
const MAX_TRACKED = 5_000
const salt = randomBytes(16).toString('hex') // new per server process; hashes cannot be linked across restarts
const hits = new Map<string, { count: number; windowStart: number }>()

function clientKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

/** true when this caller is over the limit. */
function rateLimited(key: string, now = Date.now()): boolean {
  if (hits.size >= MAX_TRACKED) {
    for (const [k, v] of hits) if (now - v.windowStart >= WINDOW_MS) hits.delete(k)
    if (hits.size >= MAX_TRACKED) hits.clear()
  }
  const entry = hits.get(key)
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now })
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

/** Test hook: forget all rate-limit state. */
export function __resetRateLimitForTests() {
  hits.clear()
}

function clean(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export async function POST(request: NextRequest) {
  // 1. Visitor asked not to be measured: honour it before doing anything else.
  if (visitorOptedOut(request.headers)) return new NextResponse(null, { status: 204, headers: NO_STORE })

  // 2. Automated clients are not visitors.
  const userAgent = request.headers.get('user-agent')
  if (isBotUserAgent(userAgent)) return new NextResponse(null, { status: 204, headers: NO_STORE })

  // 3. Per-IP limit.
  if (rateLimited(clientKey(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } })
  }

  // 4. Parse and validate.
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > SITE_EVENT_LIMITS.maxBodyBytes) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: NO_STORE })
  }
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: NO_STORE })
  }
  if (raw.length > SITE_EVENT_LIMITS.maxBodyBytes) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: NO_STORE })
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE })
  }
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event payload' }, { status: 400, headers: NO_STORE })
  }

  // 5. Reduce to the fields we keep.
  const device = deviceFromUserAgent(userAgent)
  const country = countryFromHeader(request.headers.get('x-vercel-ip-country'))
  const ownHosts = [new URL(SITE_URL).hostname, request.headers.get('host')?.split(':')[0] ?? ''].filter(Boolean)

  const rows = []
  for (const event of parsed.data) {
    const parts = splitPath(event.path)
    if (!parts) continue
    rows.push({
      event_type: event.event_type,
      path: parts.path,
      label: clean(event.label, SITE_EVENT_LIMITS.label),
      referrer_host: referrerHost(event.referrer, ownHosts),
      utm_source: clean(event.utm_source, SITE_EVENT_LIMITS.utm) ?? parts.utm.utm_source ?? null,
      utm_medium: clean(event.utm_medium, SITE_EVENT_LIMITS.utm) ?? parts.utm.utm_medium ?? null,
      utm_campaign: clean(event.utm_campaign, SITE_EVENT_LIMITS.utm) ?? parts.utm.utm_campaign ?? null,
      session_id: clean(event.session_id, SITE_EVENT_LIMITS.sessionId),
      device,
      country,
    })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid events' }, { status: 400, headers: NO_STORE })
  }

  // 6. Store. Fail closed if the service client is not configured.
  if (!hasSupabaseServiceConfig()) {
    console.error('[events] service client not configured; analytics event dropped')
    return NextResponse.json({ error: 'Analytics unavailable' }, { status: 503, headers: NO_STORE })
  }
  try {
    const { error } = await createServiceClient().from('site_events').insert(rows)
    if (error) {
      console.error('[events] insert failed:', error.message)
      return NextResponse.json({ error: 'Analytics unavailable' }, { status: 503, headers: NO_STORE })
    }
  } catch (err) {
    console.error('[events] insert failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Analytics unavailable' }, { status: 503, headers: NO_STORE })
  }

  return new NextResponse(null, { status: 204, headers: NO_STORE })
}
