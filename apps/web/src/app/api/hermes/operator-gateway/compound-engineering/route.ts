import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getCompoundEngineeringConnectorStatus } from '@/lib/operator-gateway/compound-engineering-connectors'

export const dynamic = 'force-dynamic'

// GET — founder/session guarded Compound Engineering connector status.
// Static local registry only: no plugin install, no external execution, no API-key mode.
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    return NextResponse.json({
      ...getCompoundEngineeringConnectorStatus(),
      founderOnly: true,
      autoInstallEnabled: false,
      externalExecutionEnabled: false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load compound engineering connector status' }, { status: 500 })
  }
}
