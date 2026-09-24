// src/app/api/command-centre/revenue/route.ts
//
// Founder revenue panel — read-only cleared funds from the Agency and Synthex
// Stripe accounts (see src/lib/revenue/*). Same guard as mesh-fleet:
// getUser() → 401 here, founder allow-list → 403 in proxy.ts. Stripe keys are
// only handed to the Stripe SDK; they are never logged and never returned. A
// failed read is `not_connected` with a reason class — never a $0.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getRevenueSnapshot } from '@/lib/revenue/revenue-snapshot'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await getRevenueSnapshot()
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
