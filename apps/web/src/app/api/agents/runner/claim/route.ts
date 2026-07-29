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

/**
 * How many missions may be in flight for this founder at once.
 *
 * Validated as a finite positive integer, not merely coerced. `Number(x) || 1`
 * accepted a negative: MISSION_LANE_MAX_CONCURRENT=-1 gave maxConcurrent = -1,
 * `inFlight >= -1` is true for any count, and every claimed mission was requeued
 * until its budget ran out and it failed. A misconfigured number silently
 * emptied the queue. Anything not a positive integer falls back to 1.
 */
/** Nobody runs more missions than this on one host; a larger value is a typo. */
const MAX_CONCURRENT_CEILING = 64

export function readMaxConcurrent(raw: string | undefined): number {
  const parsed = Number(raw)
  // isSafeInteger, not isInteger: `Number.isInteger(1e100)` is TRUE, so '1e100'
  // passed the old check and became both an effectively infinite concurrency
  // limit and an absurd `.limit(1e100 + 2)` on the count query. An upper ceiling
  // then bounds the honest-but-wrong values too — a limit nobody would set on
  // purpose is a misconfiguration, not an instruction.
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_CONCURRENT_CEILING) return 1
  return parsed
}

const MAX_CONCURRENT_MISSIONS = readMaxConcurrent(process.env.MISSION_LANE_MAX_CONCURRENT)

/**
 * Missions already running for this founder.
 *
 * Called BEFORE the claim, so the row about to be claimed is not yet 'running'
 * and nothing needs excluding.
 *
 * A count failure returns Infinity, not 0. The check is
 * `inFlight >= maxConcurrent`, so Infinity refuses — and that refusal is
 * `at_capacity`, which is transient, so the next poll retries. Returning 0 on
 * failure would do the opposite: an unreadable database would silently disable
 * the concurrency limit at exactly the moment things are going wrong.
 */
async function countRunning(
  client: RunnerClaimClientLike,
  founderId: string,
): Promise<number> {
  try {
    // Only enough rows to decide the comparison — the exact count above the
    // limit is not needed, and fetching it would scale with the queue.
    const { data, error } = await (client as unknown as SupabaseLike)
      .from('cc_tasks')
      .select('id')
      .eq('founder_id', founderId)
      .eq('status', 'running')
      .order('claimed_at', { ascending: true })
      .limit(MAX_CONCURRENT_MISSIONS + 2)
    if (error) return Number.POSITIVE_INFINITY
    // Same reasoning as the delivery ledger: a successful response with null or
    // a non-array body means the count is UNKNOWN, not zero. Treating it as zero
    // would admit a claim while a mission is already running.
    if (!Array.isArray(data)) return Number.POSITIVE_INFINITY
    return (data as Array<{ id: string }>).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

/**
 * The packet id of a pre-rollout voice mission, so a refusal can point at the
 * transcript that still exists in margot_voice_sessions. Falls back to the
 * external_ref, which the bridge derives from the packet id. Bounded and
 * character-restricted because it is written into an audit payload.
 */
function legacyPacketId(task: { external_ref?: unknown; metadata?: unknown }): string | null {
  const envelope = (task.metadata as { voiceMission?: Record<string, unknown> } | null)?.voiceMission
  const fromEnvelope = envelope?.packetId
  const raw =
    typeof fromEnvelope === 'string' && fromEnvelope
      ? fromEnvelope
      : typeof task.external_ref === 'string'
        ? task.external_ref.replace(/^voice:/, '')
        : ''
  const safe = raw.replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 200)
  return safe || null
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

    // Capacity is checked BEFORE claiming, for the same reason as the kill
    // switch: claiming and then putting the mission back burns its bounded
    // requeue budget every poll.
    //
    // HONEST LIMIT — this is backpressure, not a mutual-exclusion guarantee.
    // The count and the claim are two statements, so two runners polling
    // simultaneously can each read a count taken before the other's claim became
    // visible and both be admitted under maxConcurrent = 1. An independent
    // review raised exactly this, and it is correct. Narrowing the window is
    // genuinely worth having (the previous code hardcoded inFlight to 0, so the
    // limit could never refuse at all) but it must not be described as an
    // atomic limit.
    //
    // Closing the race needs the count and the claim in ONE statement — a
    // Postgres function claiming only while `running < N`, which is a prod
    // schema migration and therefore founder-gated. Recorded rather than
    // silently approximated.
    const inFlight = await countRunning(client as unknown as RunnerClaimClientLike, founderId)
    if (inFlight >= MAX_CONCURRENT_MISSIONS) {
      return NextResponse.json({ task: null, refused: 'at_capacity' }, { status: 200 })
    }

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
        // Settled before the claim above, so the gate is told the count that
        // decision was made on rather than re-reading a number that now
        // includes the row just claimed.
        inFlight,
        maxConcurrent: MAX_CONCURRENT_MISSIONS,
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
        //
        // `provenance_legacy` is a THIRD kind: the mission was approved by the
        // founder and is probably fine, but it was bridged before keyed
        // provenance existed, so it can never be authenticated and must not run.
        // It is not transient (retrying cannot mint a key it never had), and
        // treating it like a forgery writes off real work with no route back.
        // It settles as `failed` because that is the only terminal outcome this
        // release path has — but the event below carries everything needed to
        // recover it.
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
              // Recovery pointer for a pre-rollout mission. The transcript still
              // exists in margot_voice_sessions under this packet id, so
              // re-POSTing that packet to /api/pi-ceo/margot-voice/task rebridges
              // it with a signed envelope. A machine-safe reference, never the
              // objective. Find them with:
              //   select payload->>'recover_packet_id' from cc_task_events
              //     where type = 'blocked'
              //       and payload->>'lane_admission' = 'provenance_legacy';
              ...(decision.code === 'provenance_legacy'
                ? { recover_packet_id: legacyPacketId(task), recovery: 're_ingest_packet' }
                : {}),
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
