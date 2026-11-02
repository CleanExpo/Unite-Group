// Creating proposals and comp codes is founder-only (UNI-3167: "admin-only"). Other invited accounts can sign in to
// the CRM, so being signed in is not enough. An unset FOUNDER_USER_ID refuses everyone.

import { NextResponse } from 'next/server'

import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { getUser } from '@/lib/supabase/server'

export async function requireFounder(): Promise<{ founderId: string } | { denied: NextResponse }> {
  const user = await getUser()
  if (!user) return { denied: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  if (user.id !== getFounderUserId()) return { denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { founderId: user.id }
}
