// src/app/api/integrations/onepassword/grant/route.ts
//
// UNI-2310 — the founder's control surface for the 1Password access lane.
//   GET    → current grant status (active?, expires_at)
//   POST   → approve a short-TTL grant (this IS the "Approve" action)
//   DELETE → revoke any active grant immediately
//
// Founder-auth on every verb. A grant here authorises the read gate in
// src/lib/integrations/onepassword.ts; it does not itself read any secret.

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import {
  grantOpAccess,
  hasActiveOpGrant,
  revokeOpAccess,
} from '@/lib/integrations/onepassword-grants'
import { isOpConfigured } from '@/lib/integrations/onepassword'

export const dynamic = 'force-dynamic'
// The 1Password SDK is WASM-backed and needs the Node runtime (not edge).
export const runtime = 'nodejs'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const active = await hasActiveOpGrant(user.id)
    return NextResponse.json({ configured: isOpConfigured(), active })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Failed to load grant status', { route: '/api/integrations/onepassword/grant' }) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { reason?: string; ttlMinutes?: number } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine — defaults apply
  }

  try {
    const grant = await grantOpAccess(user.id, { reason: body.reason, ttlMinutes: body.ttlMinutes })
    return NextResponse.json({ granted: true, expiresAt: grant.expires_at }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Failed to create grant', { route: '/api/integrations/onepassword/grant' }) },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await revokeOpAccess(user.id)
    return NextResponse.json({ revoked: true })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Failed to revoke grant', { route: '/api/integrations/onepassword/grant' }) },
      { status: 500 },
    )
  }
}
