// src/app/api/social/[platform]/callback/route.ts
// GET /api/social/[platform]/callback?code=...&state=...
// Handles OAuth callback, exchanges code for token, stores in vault

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { exchangeCode, savePlatformTokens } from '@/lib/integrations/social'
import { verifyOAuthState } from '@/lib/oauth-state'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/founder/social?error=${error}&platform=${platform}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/founder/social?error=missing_params&platform=${platform}`, request.url)
    )
  }

  const user = await getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Anti-CSRF: the state must be a signed token bound to THIS founder and THIS
  // platform, carrying a nonce and an unexpired timestamp. Reject anything else
  // before trusting it (previously the state was an unsigned base64url blob, so
  // the callback bound tokens to an attacker-controllable founderId).
  try {
    const stateData = verifyOAuthState(state)
    if (
      stateData.founderId !== user.id ||
      stateData.platform !== platform ||
      !stateData.nonce ||
      !stateData.expiresAt ||
      Number(stateData.expiresAt) < Date.now()
    ) {
      throw new Error('state validation failed')
    }
  } catch {
    return NextResponse.redirect(
      new URL(`/founder/social?error=invalid_state&platform=${platform}`, request.url)
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/social/${platform}/callback`

  const tokens = await exchangeCode(platform, code, redirectUri)

  if (!tokens) {
    return NextResponse.redirect(
      new URL(`/founder/social?error=token_exchange_failed&platform=${platform}`, request.url)
    )
  }

  await savePlatformTokens(user.id, platform, {
    access_token: tokens.access_token,
    ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    ...(tokens.expires_in && { expires_at: Date.now() + tokens.expires_in * 1000 }),
  })

  return NextResponse.redirect(
    new URL(`/founder/social?connected=${platform}`, request.url)
  )
}
