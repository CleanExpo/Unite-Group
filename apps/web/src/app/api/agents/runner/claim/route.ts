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

import { timingSafeEqual } from 'node:crypto'
import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  claimNextQueuedTask,
  releaseClaimedTask,
  type RunnerClaimClientLike,
} from '@/lib/command-centre/runner-claim'
import { admitMissionToLane } from '@/lib/command-centre/mission-lane-binding'
import { appendTaskEvent, type SupabaseLike } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  runnerId: z.string().trim().min(1).max(128),
})

function timingSafeBearerMatch(request: Request, expectedSecret: string | undefined): boolean {
  const secret = expectedSecret?.trim()
  if (!secret) return false // dormant by default — no secret, no claims

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
      { error: `Invalid claim: ${parsed.error.issues[0]?.message ?? 'validation failed'}` },
      { status: 400 },
    )
  }

  // The kill switch is read BEFORE anything is claimed. Checking it only after
  // the claim would mean every poll made while the estate is stopped claims a
  // mission and then has to put it back — burning that mission's bounded requeue
  // budget (MAX_REQUEUE_ATTEMPTS = 3) until it is permanently failed. The safety
  // control would itself become the thing that destroys approved work. Nothing
  // is claimed here, so nothing needs releasing.
  //
  // No hard-stop reader exists in this codebase — `~/.claude/HARD_STOP` is a
  // local file and this route is serverless, so the deployable equivalent is an
  // env var. Absent means not stopped; only an explicit '1' engages it.
  const hardStop = process.env.MISSION_LANE_HARD_STOP === '1'
  if (hardStop) {
    return NextResponse.json({ task: null, refused: 'hard_stop' }, { status: 200 })
  }

  try {
    const client = createServiceClient()
    const task = await claimNextQueuedTask(client as unknown as RunnerClaimClientLike, {
      founderId,
      runnerId: parsed.data.runnerId,
    })

    if (task) {
      // The admission gate had no production caller: a task was claimed and
      // handed straight to runner.mjs, which interpolates `task.objective` into a
      // `claude --permission-mode bypassPermissions` prompt. So a mission could
      // declare read-only actionKinds while its objective text carried arbitrary
      // instructions, and nothing between voice input and an unsandboxed agent
      // ever consulted the gate that exists to stop exactly that.
      //
      // Refusal releases the claim rather than returning the task, so the runner
      // cannot act on it and the mission does not silently vanish from the queue.
      const decision = admitMissionToLane(task, {
        inFlight: 0,
        maxConcurrent: 1,
        // Already returned above if engaged; passed through so the gate keeps
        // its own ordering guarantee rather than trusting this caller.
        hardStop,
        laneAvailable: true,
        // claimNextQueuedTask returns the row AFTER flipping it to 'running',
        // so the gate is told which runner won it. Without this the status check
        // refuses every claim and the runner starves.
        claimedBy: parsed.data.runnerId,
      })

      if (!decision.admit) {
        // Whether a refusal is terminal depends on WHAT was refused.
        //
        // A verdict about the MISSION is terminal: an unclassified, unprovenanced,
        // side-effecting or above-tier mission will be refused identically on
        // every future poll, so requeueing it would have the runner claim,
        // refuse and requeue it forever.
        //
        // A verdict about the HOST is not. `hard_stop`, `lane_unavailable` and
        // `at_capacity` say nothing about whether the mission is fit to run —
        // only that this box cannot run it now. Marking those 'failed' would
        // mean engaging the kill switch silently destroys every approved mission
        // the runner happens to claim while it is engaged, and the founder would
        // come back to a queue of permanent failures caused by the safety
        // control itself. Those go back to 'queued' to be picked up later.
        const TRANSIENT: ReadonlySet<string> = new Set([
          'hard_stop',
          'lane_unavailable',
          'at_capacity',
        ])
        const outcome = TRANSIENT.has(decision.code) ? 'requeue' : 'failed'
        const release = await releaseClaimedTask(client as unknown as RunnerClaimClientLike, {
          founderId,
          taskId: task.id,
          runnerId: parsed.data.runnerId,
          outcome,
        })
        await appendTaskEvent(
          {
            founderId,
            taskId: task.id,
            type: 'blocked',
            actor: parsed.data.runnerId,
            // The code only — never the objective. A refusal reason that echoed
            // the text would put unvalidated voice input into the audit trail.
            //
            // effective_outcome, not the requested one (UNI-2398):
            // releaseClaimedTask downgrades a requeue to 'failed' once
            // MAX_REQUEUE_ATTEMPTS is exhausted, and an audit trail that logged
            // the request would claim the mission went back to the queue when it
            // was actually terminated.
            payload: {
              lane_admission: decision.code,
              effective_outcome: release.effectiveOutcome,
            },
          },
          client as unknown as SupabaseLike,
        )
        return NextResponse.json(
          { task: null, refused: decision.code },
          { status: 200 },
        )
      }

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
