import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getRuntimeTopologyStatus } from '@/lib/operator-gateway/runtime-topology'

export const dynamic = 'force-dynamic'

// GET — founder/session guarded multi-CLI runtime topology.
// Read-only design registry only: no runner dispatch, no credential storage, no production execution.
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    return NextResponse.json({
      ...getRuntimeTopologyStatus(),
      founderOnly: true,
      productionExecutionEnabled: false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load runtime topology' }, { status: 500 })
  }
}
