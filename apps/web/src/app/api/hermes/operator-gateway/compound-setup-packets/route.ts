import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getCompoundSetupPacketStatus } from '@/lib/operator-gateway/compound-setup-packets'

export const dynamic = 'force-dynamic'

// GET — founder/session guarded Compound Engineering setup packets.
// Read-only registry only: no install commands are executed and no external runner is enabled.
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const status = await getCompoundSetupPacketStatus()
    return NextResponse.json({
      ...status,
      founderOnly: true,
      noAutoInstall: true,
      externalExecutionEnabled: false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load compound setup packets' }, { status: 500 })
  }
}
