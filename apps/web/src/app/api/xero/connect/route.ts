// src/app/api/xero/connect/route.ts
// GET /api/xero/connect?business=<key>
// Redirects to Xero OAuth authorization URL.
// Requires an authenticated Supabase session (Google OAuth is sufficient for this private founder app).

import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getXeroCredentials } from '@/lib/integrations/xero'
import { signOAuthState } from '@/lib/oauth-state'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessKey = searchParams.get('business') ?? 'default'

  const { clientId } = getXeroCredentials(businessKey)
  if (!clientId) {
    return NextResponse.redirect(new URL('/founder/xero?error=not_configured', request.url))
  }

  const user = await getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // .trim() guards against accidental trailing newlines in the env var
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  const redirectUri = `${appUrl}/api/xero/callback`

  // Signed, founder-bound, time-limited state — prevents OAuth CSRF on the callback.
  const state = signOAuthState({
    businessKey,
    founderId: user.id,
    nonce: randomUUID(),
    expiresAt: String(Date.now() + 10 * 60 * 1000),
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope:
      'openid profile email offline_access accounting.reports.profitandloss.read accounting.invoices.read accounting.banktransactions accounting.contacts.read accounting.settings.read',
    state,
  })

  return NextResponse.redirect(
    `https://login.xero.com/identity/connect/authorize?${params.toString()}`
  )
}
