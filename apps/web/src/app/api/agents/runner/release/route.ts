// src/app/api/agents/runner/release/route.ts
//
// Nexus runner release endpoint (UNI-2383). The claimant runner reports a
// terminal outcome for its running task: done (draft PR opened), failed
// (hard failure, short code), or requeue (scope-creep abort — the task goes
// back to 'queued' with the claim cleared, per grill Q6).
//
// DORMANT BY DEFAULT: same bearer secret as the event ingest
// (AGENT_EVENTS_SECRET) — one founder arming step for the whole runner plane.
// Guarded by claimed_by = runnerId inside the accessor: only the claimant can
// release, and a non-matching release is an honest 404, never a silent write.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  releaseClaimedTask,
  type RunnerClaimClientLike,
  type RunnerReleaseOutcome,
} from '@/lib/command-centre/runner-claim'
import { appendTaskEvent, type SupabaseLike, type TaskEventType } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  taskId: z.string().uuid(),
  runnerId: z.string().trim().min(1).max(128),
  outcome: z.enum(['done', 'failed', 'requeue']),
  prRef: z.string().trim().max(512).nullish(),
  code: z.string().trim().max(64).nullish(),
})

const OUTCOME_EVENT: Record<RunnerReleaseOutcome, TaskEventType> = {
  done: 'completed',
  failed: 'failed',
  requeue: 'status_changed',
}

function bearerOk(request: Request): boolean {
  const secret = process.env.AGENT_EVENTS_SECRET?.trim()
  if (!secret) return false // dormant by default — no secret, no releases
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
      { error: `Invalid release: ${parsed.error.issues[0]?.message ?? 'validation failed'}` },
      { status: 400 },
    )
  }

  try {
    const client = createServiceClient()
    const task = await releaseClaimedTask(client as unknown as RunnerClaimClientLike, {
      founderId,
      taskId: parsed.data.taskId,
      runnerId: parsed.data.runnerId,
      outcome: parsed.data.outcome,
      prRef: parsed.data.prRef ?? null,
    })

    if (!task) {
      return NextResponse.json(
        { error: 'No matching running task claimed by this runner' },
        { status: 404 },
      )
    }

    await appendTaskEvent(
      {
        founderId,
        taskId: task.id,
        type: OUTCOME_EVENT[parsed.data.outcome],
        actor: parsed.data.runnerId,
        payload: {
          outcome: parsed.data.outcome,
          ...(parsed.data.prRef ? { pr_ref: parsed.data.prRef } : {}),
          ...(parsed.data.code ? { code: parsed.data.code } : {}),
        },
      },
      client as unknown as SupabaseLike,
    )

    return NextResponse.json({ task }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to release the task') },
      { status: 500 },
    )
  }
}
