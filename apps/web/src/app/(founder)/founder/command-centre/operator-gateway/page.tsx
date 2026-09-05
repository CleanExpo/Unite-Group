export const dynamic = 'force-dynamic'

// No real execute button: the presentation preserves the existing gated controls.

import { chakra, syne, jbMono } from '../fonts'
import { getUser, createClient } from '@/lib/supabase/server'
import { getCommandCentreOperatorSurfaceView } from '@/lib/operator-gateway/command-centre'
import {
  getOperatorJobsView,
  getOperatorJobEvents,
  type OperatorJobsReadClient,
  type OperatorEventsReadClient,
} from '@/lib/operator-gateway/jobs'
import {
  getGatewayConnection,
  type AgentPresenceReadClient,
} from '@/lib/operator-gateway/presence'
import { OperatorGatewayView } from './OperatorGatewayView'

export default async function OperatorGatewayPage() {
  const user = await getUser()
  // One founder-scoped (RLS) prod client serves jobs, events, and presence.
  const supabase = user ? await createClient() : null
  const jobsView =
    user && supabase
      ? await getOperatorJobsView({
          founderId: user.id,
          client: supabase as unknown as OperatorJobsReadClient,
          source: 'production',
        })
      : undefined
  const jobEvents =
    user && supabase ? await getOperatorJobEvents(supabase as unknown as OperatorEventsReadClient, user.id) : []
  const view = getCommandCentreOperatorSurfaceView({ jobsView, sandboxJobCreationEnabled: true })
  // Live agent connection — derived from operator_agent_presence heartbeats (founder-scoped).
  const agentConnection =
    user && supabase ? await getGatewayConnection(supabase as unknown as AgentPresenceReadClient, user.id) : null

  return <OperatorGatewayView view={view} jobsView={jobsView} jobEvents={jobEvents} agentConnection={agentConnection} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
