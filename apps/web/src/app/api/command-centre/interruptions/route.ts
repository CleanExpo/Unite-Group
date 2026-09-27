import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { loadInterruptionLedger } from '@/lib/mission-authority/interruptions'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }

/** UNI-2779 — the founder's interruption ledger and metric. Read-only. */
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  try {
    return NextResponse.json(await loadInterruptionLedger(user.id), { headers })
  } catch {
    return NextResponse.json({ error: 'The interruption ledger could not be read. Try again later.' }, { status: 500, headers })
  }
}
