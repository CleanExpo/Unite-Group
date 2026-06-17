// src/app/api/social/[platform]/connect/route.ts
// GET /api/social/[platform]/connect
// Redirects to social platform OAuth authorization URL

import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/integrations/social'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const user = await getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/social/${platform}/callback`

  // Signed, founder-bound, time-limited state — prevents OAuth CSRF on the callback.
  // Previously this was an UNSIGNED base64url blob, so the callback trusted an
  // attacker-controllable founderId.
  const state = signOAuthState({
    founderId: user.id,
    platform,
    nonce: randomUUID(),
    expiresAt: String(Date.now() + 10 * 60 * 1000),
  })

  const authUrl = buildOAuthUrl(platform, redirectUri, state)

  if (!authUrl) {
    return NextResponse.redirect(
      new URL(`/founder/social?error=not_configured&platform=${platform}`, request.url)
    )
  }

  return NextResponse.redirect(authUrl)
}
