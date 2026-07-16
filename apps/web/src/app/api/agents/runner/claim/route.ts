// src/app/api/agents/runner/claim/route.ts
//
// Nexus runner claim endpoint (UNI-2383). The runner POSTs its id and receives
// the highest-priority queued task, atomically flipped to 'running' with the
// claim columns set — or task: null when the queue holds nothing claimable.
//
// DORMANT BY DEFAULT: authenticated by the same bearer secret as the event
// ingest (AGENT_EVENTS_SECRET) so the founder arms the whole runner plane in
// one step. Secret unset (the prod default) ⇒ every call 401s before any work.
//
// Single-tenant: rows are scoped to FOUNDER_USER_ID via the service client;
// founder_id is never taken from the body. An immutable cc_task_events
// 'started' row records the claim for the audit trail.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  claimNextQueuedTask,
  type RunnerClaimClientLike,
} from '@/lib/command-centre/runner-claim'
import { appendTaskEvent, type SupabaseLike } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  runnerId: z.string().trim().min(1).max(128),
})

function bearerOk(request: Request): boolean {
  const secret = process.env.AGENT_EVENTS_SECRET?.trim()
  if (!secret) return false // dormant by default — no secret, no claims
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!bearerOk(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 503 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid claim: ${parsed.error.issues[0]?.message ?? 'validation failed'}` },
      { status: 400 },
    )
  }

  try {
    const client = createServiceClient()
    const task = await claimNextQueuedTask(client as unknown as RunnerClaimClientLike, {
      founderId,
      runnerId: parsed.data.runnerId,
    })

    if (task) {
      await appendTaskEvent(
        {
          founderId,
          taskId: task.id,
          type: 'started',
          actor: parsed.data.runnerId,
          payload: { claimed_by: parsed.data.runnerId },
        },
        client as unknown as SupabaseLike,
      )
    }

    return NextResponse.json({ task }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to claim a task') },
      { status: 500 },
    )
  }
}
