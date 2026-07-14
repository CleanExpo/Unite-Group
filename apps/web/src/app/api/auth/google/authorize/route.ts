// src/app/api/auth/google/authorize/route.ts
// Generates Google OAuth URL with login_hint to target a specific account
// GET /api/auth/google/authorize?email=phill@disasterrecovery.com.au

import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { signOAuthState } from '@/lib/oauth-state'
import { isGoogleConfigured } from '@/lib/integrations/google-oauth'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  // Drive (read-only) so a single Google connect also powers the Notes vault
  // (google-drive.ts). Requires the Drive API enabled + GOOGLE_DRIVE_VAULT_FOLDER_ID.
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
  'profile',
].join(' ')

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || requestUrl.origin
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = requestUrl
  const email = searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 })

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          'Google OAuth is not configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel (not placeholder values).',
      },
      { status: 503 },
    )
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',        // force refresh_token every time
    login_hint: email,
    // Signed, founder-bound, time-limited state — prevents OAuth CSRF/replay on
    // the callback. founderId binding ensures the callback can't be replayed by
    // a different session (matches the meta/tiktok/youtube/xero/microsoft flows).
    state: signOAuthState({
      email,
      founderId: user.id,
      nonce: randomUUID(),
      expiresAt: String(Date.now() + 10 * 60 * 1000),
    }),
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
