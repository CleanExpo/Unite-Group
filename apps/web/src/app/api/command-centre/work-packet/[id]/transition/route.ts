import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { applyPacketTransition } from '@/lib/command-centre/work-packet-store'
import type { PacketEvent } from '@/lib/command-centre/work-packet'
import type { SupabaseLike } from '@/lib/command-centre/tasks'

// UNI-2147 — drive a packet through its guarded lifecycle. Founder-auth.
// POST body is a PacketEvent: { type, by?, evidencePath? } where type is one of:
//   route | start | block | unblock | approve | complete
// The legacy { event } field is also accepted as an alias for { type } so older
// callers keep working. 404 when the packet does not exist, 409 when the
// transition is refused.
export const dynamic = 'force-dynamic'

const EVENT_TYPES = ['route', 'start', 'block', 'unblock', 'approve', 'complete'] as const
type EventType = (typeof EVENT_TYPES)[number]

interface TransitionBody {
  // The UI (WorkPacketLane) posts a bare PacketEvent → `type`. The route's own
  // callers may post `event`. Accept either.
  type?: string
  event?: string
  by?: string
  evidencePath?: string
}

function buildEvent(body: TransitionBody, founderId: string): PacketEvent | null {
  const type = body.type ?? body.event
  if (!type || !EVENT_TYPES.includes(type as EventType)) return null

  switch (type as EventType) {
    case 'approve':
      // The approving actor defaults to the authenticated founder.
      return { type: 'approve', by: typeof body.by === 'string' && body.by.trim() ? body.by : founderId }
    case 'complete':
      return { type: 'complete', evidencePath: typeof body.evidencePath === 'string' ? body.evidencePath : undefined }
    case 'route':
      return { type: 'route' }
    case 'start':
      return { type: 'start' }
    case 'block':
      return { type: 'block' }
    case 'unblock':
      return { type: 'unblock' }
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await context.params

  let body: TransitionBody
  try {
    body = (await request.json()) as TransitionBody
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const event = buildEvent(body, user.id)
  if (!event) return NextResponse.json({ error: 'invalid_event' }, { status: 400 })

  const db = (await createClient()) as unknown as SupabaseLike
  const result = await applyPacketTransition(db, user.id, id, event)

  if (!result.ok) {
    // A null packet means the row was never found; otherwise the transition was
    // refused by the guarded status machine (e.g. complete before approval).
    const status = result.packet === null ? 404 : 409
    return NextResponse.json(
      { error: result.packet === null ? 'not_found' : 'transition_refused', reason: result.reason },
      { status },
    )
  }

  return NextResponse.json(
    { packet: result.packet, reason: result.reason },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
