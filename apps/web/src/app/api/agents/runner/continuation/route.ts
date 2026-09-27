// src/app/api/agents/runner/continuation/route.ts
//
// UNI-2779 — the runner reads and writes a mission's persisted continuation
// (metadata.mission) so a fresh runner resumes from the row, not from a
// conversation.
//
// DORMANT BY DEFAULT: the same bearer secret as the claim and release routes
// (AGENT_EVENTS_SECRET). Secret unset ⇒ every call 401s before any work.
//
// POST runs may() server-side on the proposed next_action against the authority
// the row itself holds (the founder-signed approval, re-checked against the
// approval ledger). An action the policy does not map, or one the mission has
// no authority for, is refused 403. A stale write is refused 409 and never
// clobbers the stored continuation. Only the runner holding the claim may write.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitiseError } from '@/lib/error-reporting'
import { createServiceClient } from '@/lib/supabase/service'
import { getTaskById, type SupabaseLike } from '@/lib/command-centre/tasks'
import { DeliveryConflict, type DeliveryStoreClient } from '@/lib/command-centre/delivery-store'
import {
  ContinuationUnreadable,
  loadContinuation,
  nextStep,
  resolveMissionAuthority,
  saveContinuation,
  validateContinuation,
} from '@/lib/mission-authority/continuation'

export const dynamic = 'force-dynamic'

function timingSafeBearerMatch(request: Request, expectedSecret: string | undefined): boolean {
  const secret = expectedSecret?.trim()
  if (!secret) return false // dormant by default — no secret, no continuation reads or writes

  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const receivedBuffer = Buffer.from(header)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function bearerOk(request: Request): boolean {
  return timingSafeBearerMatch(request, process.env.AGENT_EVENTS_SECRET)
}

const taskIdSchema = z.string().uuid()
const bodySchema = z.object({
  taskId: taskIdSchema,
  runnerId: z.string().trim().min(1).max(128),
  expectedUpdatedAt: z.string().datetime().nullable(),
  continuation: z.unknown(),
})

export async function GET(request: Request) {
  if (!bearerOk(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 503 })

  const taskId = taskIdSchema.safeParse(new URL(request.url).searchParams.get('taskId'))
  if (!taskId.success) return NextResponse.json({ error: 'Query "taskId" must be a uuid' }, { status: 400 })

  try {
    const loaded = await loadContinuation({ founderId, taskId: taskId.data }, createServiceClient() as unknown as SupabaseLike)
    if (!loaded) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json({ continuation: loaded.continuation }, { status: 200 })
  } catch (err) {
    if (err instanceof ContinuationUnreadable) return NextResponse.json({ error: err.message }, { status: 422 })
    return NextResponse.json({ error: sanitiseError(err, 'Failed to load the continuation') }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!bearerOk(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 503 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid continuation: ${parsed.error.issues[0]?.message ?? 'validation failed'}` }, { status: 400 })
  }
  const checked = validateContinuation(parsed.data.continuation)
  if (!checked.ok) {
    // An action the policy does not name is an authority refusal, not a typo.
    return NextResponse.json({ error: checked.error }, { status: checked.field === 'next_action' ? 403 : 400 })
  }

  try {
    const client = createServiceClient()
    const task = await getTaskById({ founderId, taskId: parsed.data.taskId }, client as unknown as SupabaseLike)
    const claimedBy = (task as { claimed_by?: unknown } | null)?.claimed_by
    if (!task || task.status !== 'running' || claimedBy !== parsed.data.runnerId) {
      return NextResponse.json({ error: 'No matching running task claimed by this runner' }, { status: 404 })
    }

    // may() judges the proposed next_action whatever status the runner reports.
    const authority = await resolveMissionAuthority(task, client as unknown as SupabaseLike)
    const decision = nextStep(
      { ...checked.value, status: 'active', updated_at: new Date().toISOString() },
      authority,
      {},
      Date.now(),
      task.risk_level,
    )
    if (!decision.execute && decision.boundary === 'NO_AUTHORITY') {
      return NextResponse.json({ error: `Refused by mission authority: ${decision.reason}` }, { status: 403 })
    }

    const saved = await saveContinuation(task, checked.value, parsed.data.expectedUpdatedAt, {
      client: client as unknown as DeliveryStoreClient,
    })
    return NextResponse.json({ continuation: saved.continuation, decision }, { status: 200 })
  } catch (err) {
    if (err instanceof DeliveryConflict) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof ContinuationUnreadable) return NextResponse.json({ error: err.message }, { status: 422 })
    return NextResponse.json({ error: sanitiseError(err, 'Failed to save the continuation') }, { status: 500 })
  }
}
