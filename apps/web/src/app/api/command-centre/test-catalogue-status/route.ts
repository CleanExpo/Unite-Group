import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTestBranchStatus } from '@/lib/command-centre/test-catalogue'

// Mission Control test-catalogue tile reads the live branch state here, so a
// slow GitHub never holds up the command deck's server render. Founder-auth,
// metadata-only. getTestBranchStatus() never throws — it degrades honestly.
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const payload = await getTestBranchStatus()
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
