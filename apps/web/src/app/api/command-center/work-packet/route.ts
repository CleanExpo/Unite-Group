import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { createIssue } from '@/lib/integrations/linear'
import { buildWorkPacket, createPacketLinearWork, type WorkPacketRequest } from '@/lib/command-centre/work-packet'
import {
  saveWorkPacket,
  listWorkPackets,
  type ListWorkPacketsFilter,
} from '@/lib/command-centre/work-packet-store'
import type { PacketStatus } from '@/lib/command-centre/work-packet'
import type { SupabaseLike } from '@/lib/command-centre/tasks'

// UNI-2147 — Mission Control work generator. Founder-auth. Builds an execution
// packet from a plain request, persists it (so it survives a restart / approval
// round-trip), and returns it + the (dry-run) Linear issue input. Live Linear
// creation is gated by CC_LINEAR_LIVE; the dry-run path makes no call.
// GET lists the founder's durable packets.
export const dynamic = 'force-dynamic'

const PACKET_STATUSES: PacketStatus[] = ['draft', 'routed', 'running', 'blocked', 'awaiting_approval', 'completed']

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: WorkPacketRequest
  try {
    body = (await request.json()) as WorkPacketRequest
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!body || typeof body.outcome !== 'string' || body.outcome.trim().length === 0) {
    return NextResponse.json({ error: 'outcome_required' }, { status: 400 })
  }

  const packet = buildWorkPacket(body, { now: new Date().toISOString() })
  const result = await createPacketLinearWork(packet, { createIssue }, { live: true })

  // Persist the (possibly Linear-stamped) packet so it is durable. Read back
  // through the store so the response reflects exactly what was stored.
  const db = (await createClient()) as unknown as SupabaseLike
  const saved = await saveWorkPacket(db, user.id, result.packet)

  return NextResponse.json(
    { ...result, packet: saved },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  const projectKey = url.searchParams.get('projectKey') ?? undefined
  const limitParam = url.searchParams.get('limit')

  const filter: ListWorkPacketsFilter = {}
  if (statusParam && PACKET_STATUSES.includes(statusParam as PacketStatus)) {
    filter.status = statusParam as PacketStatus
  }
  if (projectKey) filter.projectKey = projectKey
  if (limitParam) {
    const limit = Number.parseInt(limitParam, 10)
    if (Number.isFinite(limit)) filter.limit = limit
  }

  const db = (await createClient()) as unknown as SupabaseLike
  const packets = await listWorkPackets(db, user.id, filter)

  return NextResponse.json({ packets }, { headers: { 'Cache-Control': 'no-store' } })
}
