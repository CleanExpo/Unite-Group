// GET /api/command-centre/project-integrations/work-packets
// Founder-auth, dry-run RANA work packets generated from project manifest gaps.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { createIssue } from '@/lib/integrations/linear'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'
import { createPacketLinearWork, type CreatePacketResult, type WorkPacket } from '@/lib/command-centre/work-packet'
import { listWorkPackets, saveWorkPacket } from '@/lib/command-centre/work-packet-store'
import type { SupabaseLike } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

interface CreateWorkPacketsRequest {
  live?: boolean
  queue?: boolean
}

async function loadGapPackets() {
  const projects = await getProjects()
  const integrations = await loadProjectIntegrationStatuses(projects)
  return buildProjectIntegrationWorkPackets(integrations, {
    now: new Date().toISOString(),
  })
}

function packetKey(packet: WorkPacket): string {
  return `${packet.projectKey}::${packet.outcome.trim().toLowerCase()}`
}

async function persistQueuedResults(
  db: SupabaseLike,
  founderId: string,
  results: CreatePacketResult[],
) {
  const existing = await listWorkPackets(db, founderId, { limit: 100 })
  const seen = new Set(existing.map(packetKey))
  const queued: WorkPacket[] = []
  const skipped: WorkPacket[] = []

  for (const result of results) {
    const key = packetKey(result.packet)
    if (seen.has(key)) {
      skipped.push(result.packet)
      continue
    }
    const saved = await saveWorkPacket(db, founderId, result.packet)
    seen.add(key)
    queued.push(saved)
  }

  return { queued, skipped }
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
    const queue = body.queue !== false
    const persistence = queue
      ? await persistQueuedResults(
        (await createClient()) as unknown as SupabaseLike,
        user.id,
        results,
      )
      : { queued: [], skipped: [] }

    return NextResponse.json({
      source: 'command-centre:project-integration-work-packets:create-linear',
      mode: results.some(result => result.mode === 'live') ? 'live' : 'dry-run',
      queue,
      count: results.length,
      queuedCount: persistence.queued.length,
      skippedExistingCount: persistence.skipped.length,
      results,
      queued: persistence.queued,
      skippedExisting: persistence.skipped,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project integration work packets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
