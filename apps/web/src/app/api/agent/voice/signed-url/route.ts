/**
 * POST /api/agent/voice/signed-url — Public site voice CTA (UNI-2357)
 *
 * PUBLIC ROUTE (listed in PUBLIC_PATHS, src/proxy.ts): auth is the publishable
 * site key in the body, validated in-route against `site_keys` via the
 * service-role client — same category as the /api/agent chat route. Mints a
 * short-lived ElevenLabs convai signed URL the browser voice client opens.
 *
 * Uses its OWN agent id (`ELEVENLABS_SITE_AGENT_ID`), never the founder's
 * Margot agent (`ELEVENLABS_MARGOT_AGENT_ID`). Zero new dependencies — the
 * signed URL is fetched from ElevenLabs REST with plain fetch, mirroring
 * src/app/api/pi-ceo/margot-voice/signed-url/route.ts.
 *
 * The client (browser) half — the ElevenLabs WebRTC voice widget — is NOT in
 * this change: it needs `@elevenlabs/react`, a new dependency that requires
 * founder sign-off against the apps/web no-new-deps rule. This route is the
 * dependency-free server foundation; it is dark until a site key is minted and
 * ELEVENLABS_SITE_AGENT_ID is set.
 *
 * ACTIVATION PRECONDITIONS (before setting ELEVENLABS_SITE_AGENT_ID in prod):
 * a publishable site key is embedded in public HTML and therefore harvestable,
 * and each mint gates a billed ElevenLabs conversation. Two controls the anon
 * gate below does NOT provide must be in place first:
 *   1. Mint the activating site_keys row with a NON-EMPTY `allowed_origins` —
 *      the empty-list "any origin" path (see validateSiteKey) is unsafe here.
 *   2. Add a durable per-key/per-founder daily mint cap. The in-memory
 *      per-isolate limiter below is best-effort only (resets on cold start,
 *      not shared across regions); it is not a real global spend ceiling.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateSiteKey } from '@/lib/site-agent/site-keys'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const ELEVENLABS_SIGNED_URL_ENDPOINT =
  'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url'

const MAX_KEY_CHARS = 256

// ---------------------------------------------------------------------------
// Rate limiting — same sliding-window pattern as /api/agent, keyed by
// (site key, IP). In-memory, per-isolate (documented limitation): resets on
// cold start, not shared across regions/instances. The middleware's `ai`-tier
// IP limit (see src/lib/middleware/rate-limit.ts — /api/agent → 'ai') also
// covers every path under /api/agent, this route included.
// ---------------------------------------------------------------------------

const RATE_LIMIT = 10 // signed-URL mints per window per (site key, IP)
const RATE_WINDOW_MS = 60_000
const buckets = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_WINDOW_MS
  const timestamps = (buckets.get(key) ?? []).filter((ts) => ts > windowStart)
  if (timestamps.length >= RATE_LIMIT) {
    buckets.set(key, timestamps)
    return true
  }
  timestamps.push(now)
  buckets.set(key, timestamps)
  return false
}

function getClientIp(request: Request): string {
  for (const header of ['x-vercel-forwarded-for', 'x-forwarded-for']) {
    const value = request.headers.get(header)
    const first = value?.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  })
}

interface ParsedBody {
  siteKey: string
}

function parseBody(raw: unknown): ParsedBody | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Body must be a JSON object' }
  const { siteKey } = raw as Record<string, unknown>
  if (typeof siteKey !== 'string' || siteKey.trim() === '') {
    return { error: 'siteKey is required' }
  }
  if (siteKey.length > MAX_KEY_CHARS) return { error: 'siteKey too long' }
  return { siteKey: siteKey.trim() }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const parsed = parseBody(raw)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: cors })
  }

  if (isRateLimited(`${parsed.siteKey}:${getClientIp(request)}`)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...cors, 'Retry-After': '60' } },
    )
  }

  const supabase = createServiceClient()
  const validation = await validateSiteKey(supabase, parsed.siteKey, origin)
  if (!validation.ok) {
    // Log the specific reason server-side; return a generic 401 so an anonymous
    // caller cannot distinguish unknown-key from inactive/wrong-origin.
    console.warn(`[agent/voice] site key rejected: ${validation.reason}`)
    return NextResponse.json({ error: 'Invalid site key' }, { status: 401, headers: cors })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  const agentId = process.env.ELEVENLABS_SITE_AGENT_ID?.trim()
  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: 'Voice agent is not configured' },
      { status: 503, headers: cors },
    )
  }

  const url = new URL(ELEVENLABS_SIGNED_URL_ENDPOINT)
  url.searchParams.set('agent_id', agentId)
  url.searchParams.set('include_conversation_id', 'true')

  try {
    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'elevenlabs_signed_url_failed' },
        { status: 502, headers: cors },
      )
    }
    const data = await upstream.json()
    if (typeof data?.signed_url !== 'string' || data.signed_url.trim() === '') {
      return NextResponse.json(
        { error: 'elevenlabs_signed_url_failed' },
        { status: 502, headers: cors },
      )
    }

    return NextResponse.json(
      { signed_url: data.signed_url, expires_in_seconds: 900 },
      { headers: { ...cors, 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'elevenlabs_unreachable' }, { status: 502, headers: cors })
  }
}
