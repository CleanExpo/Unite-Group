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
//
// UNI-2779 — SERVICE BOUNDARY. The runner's PATH shims are defence in depth;
// this route is the enforcement. Every reported outcome/action is judged by
// may() against the authority the row holds, and anything may() would not
// continue is refused 403 before the row is touched. The one exception is
// outcome 'blocked' (the runner's RUNNER_BLOCKED: <CLASS>: <reason> line):
// it is accepted and recorded as an interruption. Only
// LEGITIMATE_PROTECTED_BOUNDARY stops the mission for the founder; every other
// class is recorded and the mission goes back to the queue to continue.

import { timingSafeEqual } from 'node:crypto'
import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  releaseClaimedTask,
  type RunnerClaimClientLike,
  type RunnerReleaseOutcome,
} from '@/lib/command-centre/runner-claim'
import { appendTaskEvent, getTaskById, type SupabaseLike, type TaskEventType } from '@/lib/command-centre/tasks'
import { resolveMissionAuthority } from '@/lib/mission-authority/continuation'
import { INTERRUPTION_CLASSES, PROTECTED_BOUNDARY_CLASS, recordInterruption } from '@/lib/mission-authority/interruptions'
import { isMissionScoped, releaseVerdict } from '@/lib/mission-authority/runner-boundary'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  taskId: z.string().uuid(),
  runnerId: z.string().trim().min(1).max(128),
  outcome: z.enum(['done', 'failed', 'requeue', 'blocked']),
  prRef: z.string().trim().max(512).nullish(),
  code: z.string().trim().max(64).nullish(),
  /** The policy action the runner asserts it took; judged by may() whenever present. */
  action: z.string().trim().min(1).max(64).optional(),
  interruptionClass: z.string().optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
}).refine(
  (b) => b.outcome !== 'blocked' || (INTERRUPTION_CLASSES.includes(b.interruptionClass ?? '') && !!b.reason),
  { message: 'a blocked report needs an interruptionClass from the policy and a reason', path: ['interruptionClass'] },
)

const OUTCOME_EVENT: Record<RunnerReleaseOutcome, TaskEventType> = {
  done: 'completed',
  failed: 'failed',
  requeue: 'status_changed',
  blocked: 'blocked',
}

function timingSafeBearerMatch(request: Request, expectedSecret: string | undefined): boolean {
  const secret = expectedSecret?.trim()
  if (!secret) return false // dormant by default — no secret, no releases

  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const receivedBuffer = Buffer.from(header)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function bearerOk(request: Request): boolean {
  return timingSafeBearerMatch(request, process.env.AGENT_EVENTS_SECRET)
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
    const body = parsed.data
    const current = await getTaskById({ founderId, taskId: body.taskId }, client as unknown as SupabaseLike)
    if (!current || current.status !== 'running' || (current as { claimed_by?: unknown }).claimed_by !== body.runnerId) {
      return NextResponse.json({ error: 'No matching running task claimed by this runner' }, { status: 404 })
    }

    let outcome: RunnerReleaseOutcome = body.outcome
    if (body.outcome === 'blocked') {
      await recordInterruption(
        { founderId, taskId: current.id, class: body.interruptionClass as string, source: body.runnerId, reason: body.reason as string },
        client as unknown as SupabaseLike,
      )
      // Only a legitimate protected boundary waits for the founder. Every other
      // class is not a reason to interrupt: recorded, then back to the queue.
      if (body.interruptionClass !== PROTECTED_BOUNDARY_CLASS) outcome = 'requeue'
    } else {
      const authority = isMissionScoped(current)
        ? await resolveMissionAuthority(current, client as unknown as SupabaseLike)
        : null
      const verdict = releaseVerdict({
        task: current,
        authority,
        runnerId: body.runnerId,
        outcome: body.outcome,
        action: body.action,
        target: body.prRef ?? null,
      })
      if (!verdict.allowed) {
        return NextResponse.json({ error: `Refused by mission authority: ${verdict.reason}` }, { status: 403 })
      }
    }

    const { task, effectiveOutcome } = await releaseClaimedTask(
      client as unknown as RunnerClaimClientLike,
      {
        founderId,
        taskId: body.taskId,
        runnerId: body.runnerId,
        outcome,
        prRef: body.prRef ?? null,
      },
    )

    if (!task) {
      return NextResponse.json(
        { error: 'No matching running task claimed by this runner' },
        { status: 404 },
      )
    }

    // UNI-2398 — audit the EFFECTIVE outcome: a capped requeue is released as
    // 'failed' (UNI-2396), and recording the raw requested 'requeue' here would
    // write a ghost requeue event that never happened.
    const reviewHandoff = effectiveOutcome === 'done' && task.status === 'awaiting_approval'
    await appendTaskEvent(
      {
        founderId,
        taskId: task.id,
        type: reviewHandoff ? 'status_changed' : OUTCOME_EVENT[effectiveOutcome],
        actor: parsed.data.runnerId,
        payload: {
          outcome: reviewHandoff ? 'draft_pr_opened' : effectiveOutcome,
          ...(reviewHandoff ? { status: 'awaiting_approval' } : {}),
          ...(parsed.data.prRef ? { pr_ref: parsed.data.prRef } : {}),
          ...(parsed.data.code ? { code: parsed.data.code } : {}),
          ...(parsed.data.outcome === 'blocked' ? { interruption_class: parsed.data.interruptionClass } : {}),
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
