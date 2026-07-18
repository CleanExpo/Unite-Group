import { NextResponse } from 'next/server'

import {
  listAgentEvents,
  type AgentEventsClientLike,
} from '@/lib/command-centre/agent-events'
import { isMissingTableError } from '@/lib/command-centre/agent-events-wall'
import { buildMachineActivityView } from '@/lib/command-centre/machine-activity'
import { createClient, getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const now = Date.now()
  try {
    const client = (await createClient()) as unknown as AgentEventsClientLike
    const events = await listAgentEvents(client, user.id, 200)
    return NextResponse.json(buildMachineActivityView(events, now), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    if (isMissingTableError(message)) {
      return NextResponse.json(
        buildMachineActivityView([], now, 'not_connected', 'migration_not_applied'),
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.json(
      buildMachineActivityView([], now, 'error', 'query_failed'),
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
