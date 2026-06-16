// GET /api/command-centre/project-integrations/work-packets
// Founder-auth, dry-run RANA work packets generated from project manifest gaps.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createIssue } from '@/lib/integrations/linear'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'
import { createPacketLinearWork } from '@/lib/command-centre/work-packet'

export const dynamic = 'force-dynamic'

interface CreateWorkPacketsRequest {
  live?: boolean
}

async function loadGapPackets() {
  const projects = await getProjects()
  const integrations = await loadProjectIntegrationStatuses(projects)
  return buildProjectIntegrationWorkPackets(integrations, {
    now: new Date().toISOString(),
  })
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const packets = await loadGapPackets()

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

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: CreateWorkPacketsRequest = {}
  try {
    body = (await request.json()) as CreateWorkPacketsRequest
  } catch {
    body = {}
  }

  try {
    const packets = await loadGapPackets()
    const results = await Promise.all(
      packets.map(({ packet }) =>
        createPacketLinearWork(packet, { createIssue }, { live: body.live === true }),
      ),
    )

    return NextResponse.json({
      source: 'command-centre:project-integration-work-packets:create-linear',
      mode: results.some(result => result.mode === 'live') ? 'live' : 'dry-run',
      count: results.length,
      results,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project integration work packets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
