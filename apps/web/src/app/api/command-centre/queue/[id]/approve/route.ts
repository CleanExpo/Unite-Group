// src/app/api/command-centre/queue/[id]/approve/route.ts
//
// CC-11 — Approvals lane. POST a decision against a queue task:
//   { decision: 'approve'|'reject'|'edit'|'defer', note?: string }
//     → records the decision in cc_approvals,
//     → transitions the task (approve→queued, reject→failed, defer→blocked; edit→no change),
//     → appends an immutable 'approved' audit event.
// Auth-gated (Supabase getUser → 401); founder-scoped by RLS. 404 if the task
// isn't the founder's.
//
// Note: lives under queue/ (not tasks/) because the repo .gitignore ignores any
// `tasks/` directory (Claude task state).

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { applyApproval, decisionToStatus, type ApprovalDecision } from '@/lib/command-centre/approvals'
import { isLegalTransition } from '@/lib/command-centre/task-transitions'

export const dynamic = 'force-dynamic'

const VALID_DECISIONS: readonly ApprovalDecision[] = ['approve', 'reject', 'edit', 'defer']

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  let body: { decision?: unknown; note?: unknown }
  try {
    body = (await request.json()) as { decision?: unknown; note?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const decision = typeof body.decision === 'string' ? body.decision : ''
  if (!(VALID_DECISIONS as readonly string[]).includes(decision)) {
    return NextResponse.json(
      { error: `Field "decision" must be one of: ${VALID_DECISIONS.join(', ')}` },
      { status: 400 },
    )
  }
  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null

  // Ensure the task exists and belongs to this founder before recording anything.
  let task
  try {
    task = await getTaskById({ founderId: user.id, taskId: id })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to load task') },
      { status: 500 },
    )
  }
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // UNI-2417 governance guard: an approval decision may only be applied to a task
  // whose CURRENT status legally permits it under the matrix's `approval` edge
  // (proposed/awaiting_approval → queued|failed|blocked). Without this, a founder
  // could approve a `done`/`failed`/`running`/`blocked` task straight back to
  // `queued`, resurrecting a terminal/in-flight task into the runner's claimable
  // queue. `edit` implies no status change (decisionToStatus → null) and is
  // always allowed. Same-state decisions are legal no-ops.
  const targetStatus = decisionToStatus(decision as ApprovalDecision)
  if (targetStatus && !isLegalTransition(task.status, targetStatus, 'approval')) {
    return NextResponse.json(
      {
        error: `Illegal approval: "${task.status}" → "${targetStatus}" is not permitted`,
        from: task.status,
        to: targetStatus,
      },
      { status: 409 },
    )
  }

  // Annotate the decision with the persisted Senior Board verdict when one
  // exists on the task (metadata.board — written by POST /api/command-centre/board).
  const board = (task.metadata as { board?: { verdict?: unknown } } | undefined)?.board
  const boardVerdict =
    board && typeof board.verdict === 'string' && board.verdict ? board.verdict : null

  try {
    const result = await applyApproval({
      founderId: user.id,
      taskId: id,
      decision: decision as ApprovalDecision,
      approver: 'founder',
      note,
      boardVerdict,
      // UNI-2436 TOCTOU guard: the status write is conditional on the task still
      // holding the status we read above; a lost race surfaces as result.conflict.
      expectedStatus: task.status,
    })
    if (result.conflict) {
      return NextResponse.json(
        {
          error: 'Task status changed since it was read; re-read and retry',
          from: task.status,
          to: targetStatus,
        },
        { status: 409 },
      )
    }
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to apply approval') },
      { status: 500 },
    )
  }
}
