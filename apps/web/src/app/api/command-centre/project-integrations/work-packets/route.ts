// GET /api/command-centre/project-integrations/work-packets
// Founder-auth, dry-run RANA work packets generated from project manifest gaps.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const projects = await getProjects()
    const integrations = await loadProjectIntegrationStatuses(projects)
    const packets = buildProjectIntegrationWorkPackets(integrations, {
      now: new Date().toISOString(),
    })

    return NextResponse.json({
      source: 'command-centre:project-integration-work-packets',
      count: packets.length,
      packets,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build project integration work packets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
