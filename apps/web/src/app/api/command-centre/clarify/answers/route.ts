// src/app/api/command-centre/clarify/answers/route.ts
//
// POST /api/command-centre/clarify/answers
//
// Persists a founder's answers into metadata.clarifications, merging with
// prior questions/generatedAt and setting answeredAt. Returns { ok: true }.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Body validation ───────────────────────────────────────────────────────
  let body: { taskId?: unknown; answers?: unknown }
  try {
    body = (await request.json()) as { taskId?: unknown; answers?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) {
    return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  }

  if (
    typeof body.answers !== 'object' ||
    body.answers === null ||
    Array.isArray(body.answers)
  ) {
    return NextResponse.json({ error: 'Field "answers" must be an object' }, { status: 400 })
  }
  const answers = body.answers as Record<string, string>

  // ── Task lookup (founder-scoped) ──────────────────────────────────────────
  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // ── Merge answers into existing clarifications ────────────────────────────
  const prev = (task.metadata?.clarifications ?? {
    questions: [],
    answers: {},
    generatedAt: null,
  }) as Record<string, unknown>

  const persisted = await mergeTaskMetadata({
    founderId: user.id,
    taskId,
    patch: {
      clarifications: {
        ...prev,
        answers,
        answeredAt: new Date().toISOString(),
      },
    },
  })
  if (!persisted) {
    return NextResponse.json({ error: 'Failed to persist answers' }, { status: 500 })
  }

  // ── Append audit event (best-effort; does not fail the route) ────────────
  try {
    await appendTaskEvent({
      founderId: user.id,
      taskId,
      type: 'comment',
      actor: 'founder',
      payload: { kind: 'clarify_answers' },
    })
  } catch {
    // best-effort — audit failure must not block the response
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
