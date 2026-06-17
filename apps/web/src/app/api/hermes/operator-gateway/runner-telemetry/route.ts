import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getRunnerTelemetryStatus } from '@/lib/operator-gateway/runner-telemetry'

export const dynamic = 'force-dynamic'

// GET — founder/session guarded runner telemetry contract.
// Read-only status only: no runner dispatch, no credential storage, no browser/computer-use grant.
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    return NextResponse.json({
      ...getRunnerTelemetryStatus(),
      founderOnly: true,
      dispatchEnabled: false,
      liveRunnerEnabled: false,
      productionExecutionEnabled: false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load runner telemetry' }, { status: 500 })
  }
}
