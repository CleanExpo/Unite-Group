// src/app/api/drip/unsubscribe/route.ts
// Public drip unsubscribe endpoint (UNI-2291).
//
// PUBLIC route (allow-listed by exact path in src/proxy.ts, rate-limited
// there before auth). Authorisation is the signed token alone: it names one
// (founder, email) pair and can do exactly one thing — suppress that address.
//
// GET never writes. Mail scanners and link prefetchers follow GET links, so
// GET only verifies the token and shows a confirm button that POSTs back.
// POST writes the suppression row — the same POST serves RFC 8058 one-click
// (`List-Unsubscribe=One-Click` form body, token in the query string).
// drip_suppressions has FORCED founder-only RLS and no anon policy; the write
// goes through the service-role client with founder_id taken from the token.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  DRIP_UNSUBSCRIBE_PATH,
  recordSuppression,
  verifyUnsubscribeToken,
} from '@/lib/campaigns/drip-unsubscribe'

export const dynamic = 'force-dynamic'

function page(status: number, title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem">${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  )
}

const INVALID = () =>
  page(400, 'Link not valid', '<h1>Link not valid</h1><p>This unsubscribe link is invalid or incomplete.</p>')

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const verified = verifyUnsubscribeToken(token)
  if (!verified || !token) return INVALID()

  const action = `${DRIP_UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`
  return page(
    200,
    'Unsubscribe',
    `<h1>Unsubscribe</h1><p>Stop sending these emails to <strong>${escapeHtml(
      verified.email
    )}</strong>?</p><form method="post" action="${escapeHtml(
      action
    )}"><button type="submit">Unsubscribe</button></form>`
  )
}

export async function POST(request: NextRequest) {
  const verified = verifyUnsubscribeToken(request.nextUrl.searchParams.get('token'))
  if (!verified) return INVALID()

  const isOneClick = await request
    .formData()
    .then((form) => form.get('List-Unsubscribe') === 'One-Click')
    .catch(() => false)

  const { error } = await recordSuppression(
    createServiceClient(),
    verified.founderId,
    verified.email,
    isOneClick ? 'list_unsubscribe_one_click' : 'unsubscribe_link'
  )
  if (error) {
    console.error('[drip/unsubscribe] suppression write failed:', error)
    return page(
      500,
      'Unsubscribe not recorded',
      '<h1>Unsubscribe not recorded</h1><p>Something went wrong on our side. Please try the link again shortly.</p>'
    )
  }

  return page(
    200,
    'Unsubscribed',
    `<h1>Unsubscribed</h1><p>${escapeHtml(verified.email)} will not receive these emails again.</p>`
  )
}
