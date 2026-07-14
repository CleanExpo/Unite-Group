// GET /api/auth/linkedin/authorize?business={key}
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { signOAuthState } from '@/lib/oauth-state'
import { requireOAuthEnv } from '@/lib/oauth-env-guard'

export const dynamic = 'force-dynamic'

const SCOPES = ['w_member_social', 'r_organization_social', 'rw_organization_admin'].join(' ')

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessKey = searchParams.get('business')
  if (!businessKey) return NextResponse.json({ error: 'business param required' }, { status: 400 })

  // Guard: fail loud if LinkedIn OAuth env vars are absent. Previously the
  // route would redirect to LinkedIn with client_id=undefined in the URL.
  const envCheck = requireOAuthEnv({
    check: 'linkedin_authorize',
    required: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'NEXT_PUBLIC_APP_URL'],
  })
  if (!envCheck.ok) return envCheck.response

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  // Signed, founder-bound, time-limited state — prevents OAuth CSRF/replay on
  // the callback. founderId binding ensures the callback can't be replayed by
  // a different session (matches the meta/tiktok/youtube/xero/microsoft flows).
  const state = signOAuthState({
    businessKey,
    founderId: user.id,
    nonce: randomUUID(),
    expiresAt: String(Date.now() + 10 * 60 * 1000),
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${APP_URL}/api/auth/linkedin/callback`,
    state,
    scope: SCOPES,
  })

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
