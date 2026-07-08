import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { listInProgressPRs } from '@/lib/command-centre/in-progress-prs'

// UNI-2340 fast-follow — In-Progress PRs tile reads this route instead of
// blocking the command deck's server render. Founder-auth, metadata-only.
// listInProgressPRs() self-loads the portfolio repo list from the registry
// when none is passed and never throws — it degrades honestly instead.
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const payload = await listInProgressPRs()
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
