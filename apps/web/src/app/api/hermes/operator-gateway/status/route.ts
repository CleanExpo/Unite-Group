import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { getGatewayStatus } from '@/lib/operator-gateway/lanes'
import { getGatewayConnection, type AgentPresenceReadClient } from '@/lib/operator-gateway/presence'

export const dynamic = 'force-dynamic'

// GET — Model Operator Gateway status summary (read-only, founder-guarded).
// Surfaces active/blocked lane counts, the no-API-key mode flag, and the LIVE
// agent connection derived from operator_agent_presence heartbeats (founder-scoped,
// RLS). The connection block degrades to an honest offline when no agent has
// checked in or the presence table is not yet provisioned. No writes.
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Cast to the narrow read interface at the boundary (mirrors getSandboxOperatorJobsClient).
  const supabase = (await createClient()) as unknown as AgentPresenceReadClient
  const connection = await getGatewayConnection(supabase, user.id)

  return NextResponse.json({ ...getGatewayStatus(), connection })
}
