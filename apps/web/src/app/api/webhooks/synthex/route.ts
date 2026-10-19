// src/app/api/webhooks/synthex/route.ts
//
// Synthex witness-event receiver (Mission Control slice 1). Synthex's
// lib/unite-group-connector.ts POSTs fire-and-forget events here; each lands as
// ONE redacted cc_agent_events row (names + targets, no payload) so Mission
// Control witnesses what Synthex did. When the event names a founder mission,
// its whitelisted structured detail (count, window, post URL, occurredAt…) is
// kept in that mission's cc_task_events payload. Any event naming a postId is
// also appended to cc_synthex_post_events for the Mission Control calendar.
// Replaces the undeployed apps/empire /api/events receiver.
//
// DORMANT BY DEFAULT: SYNTHEX_EVENTS_API_KEY unset ⇒ 503 before any work.
// /api/webhooks is public in proxy.ts because this route verifies its own key.
// Single tenant: rows are written for FOUNDER_USER_ID, never from the body.
// Write-then-confirm: a failed insert is a 500, never a green over a dropped
// event. A witness event never changes cc_tasks status.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sanitiseError } from '@/lib/error-reporting'
import { createServiceClient } from '@/lib/supabase/service'
import {
  insertAgentEvents,
  type AgentEventsClientLike,
} from '@/lib/command-centre/agent-events'
import { appendTaskEvent, getTaskById, type SupabaseLike } from '@/lib/command-centre/tasks'
import { recordSynthexPostEvent, type SynthexPostsClient } from '@/lib/command-centre/synthex-posts'
import {
  synthexEventDetail,
  synthexEventSchema,
  summariseEvent,
  toAgentEventInput,
} from '@/lib/integrations/synthex-events'

export const dynamic = 'force-dynamic'

function configuredKey(): string | null {
  return process.env.SYNTHEX_EVENTS_API_KEY?.trim() || null
}

function keyMatches(request: Request, expected: string): boolean {
  const received = Buffer.from(request.headers.get('x-api-key') ?? '')
  const wanted = Buffer.from(expected)
  return received.length === wanted.length && timingSafeEqual(received, wanted)
}

/** Dataless reachability probe: reveals only whether the receiver is armed. */
export async function GET() {
  return NextResponse.json({ ok: true, configured: configuredKey() !== null })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}

export async function POST(request: Request) {
  const key = configuredKey()
  if (!key) {
    return NextResponse.json({ error: 'receiver_not_configured' }, { status: 503 })
  }
  if (!keyMatches(request, key)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = synthexEventSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_event', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const event = parsed.data

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 })
  }

  let client: ReturnType<typeof createServiceClient>
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 })
  }

  let id: string | undefined
  try {
    const inserted = await insertAgentEvents(
      client as unknown as AgentEventsClientLike,
      founderId,
      [toAgentEventInput(event)],
    )
    id = inserted[0]?.id
    if (!id) throw new Error('insert returned no row')
  } catch (err) {
    return NextResponse.json(
      { error: 'insert_failed', message: sanitiseError(err, 'Failed to record Synthex event') },
      { status: 500 },
    )
  }

  // Optional mission linkage. The witness row is already durable, so a linkage
  // problem is reported in the body rather than turned into a retry-duplicate.
  let mission: 'linked' | 'not_found' | 'link_failed' | undefined
  if (event.missionId) {
    try {
      const db = client as unknown as SupabaseLike
      const task = await getTaskById({ founderId, taskId: event.missionId }, db)
      if (!task) {
        mission = 'not_found'
      } else {
        await appendTaskEvent(
          {
            founderId,
            taskId: task.id,
            type: 'comment',
            actor: 'synthex',
            payload: {
              source: 'synthex',
              event_type: event.type.slice(0, 128),
              summary: summariseEvent(event),
              ...synthexEventDetail(event),
            },
          },
          db,
        )
        mission = 'linked'
      }
    } catch {
      mission = 'link_failed'
    }
  }

  // Calendar post store. Same rule: the witness row is durable, so a failed
  // post write is reported in the body, never retried into a duplicate.
  let post: 'recorded' | 'record_failed' | undefined
  try {
    if ((await recordSynthexPostEvent(client as unknown as SynthexPostsClient, founderId, event)) === 'recorded') post = 'recorded'
  } catch {
    post = 'record_failed'
  }

  return NextResponse.json(
    { ok: true, id, ...(mission ? { mission } : {}), ...(post ? { post } : {}) },
    { status: 201 },
  )
}
