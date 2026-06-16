import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createIssue } from '@/lib/integrations/linear'
import { buildWorkPacket, createPacketLinearWork, type WorkPacketRequest } from '@/lib/command-centre/work-packet'

// UNI-2147 — Mission Control work generator. Founder-auth. Builds an execution
// packet from a plain request and returns it + the (dry-run) Linear issue input.
// Live Linear creation is gated by CC_LINEAR_LIVE; the dry-run path makes no call.
export const dynamic = 'force-dynamic'

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
  const result = await createPacketLinearWork(packet, { createIssue })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
