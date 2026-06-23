// src/app/api/command-centre/clarify/route.ts
//
// POST /api/command-centre/clarify
//
// Loads a founder's task, generates clarifying questions via LLM, persists
// them to metadata.clarifications, and returns { questions: string[] }.
// Best-effort: if question generation returns an empty array the route still
// returns 200 with { questions: [] }.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateClarifyingQuestions } from '@/lib/command-centre/clarify'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Body validation ───────────────────────────────────────────────────────
  let body: { taskId?: unknown }
  try {
    body = (await request.json()) as { taskId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) {
    return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  }

  // ── Task lookup (founder-scoped) ──────────────────────────────────────────
  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // ── Generate clarifying questions (best-effort; may return []) ────────────
  const questions = await generateClarifyingQuestions(task.objective)
  const generatedAt = new Date().toISOString()

  // ── Persist to metadata.clarifications ───────────────────────────────────
  const persisted = await mergeTaskMetadata({
    founderId: user.id,
    taskId,
    patch: {
      clarifications: {
        questions,
        answers: {},
        generatedAt,
        answeredAt: null,
      },
    },
  })
  if (!persisted) {
    return NextResponse.json({ error: 'Failed to persist questions' }, { status: 500 })
  }

  // ── Append audit event (best-effort; does not fail the route) ────────────
  // TaskEventType 'comment' is a valid member of the union — used to signal
  // a system-generated annotation without a status change.
  try {
    await appendTaskEvent({
      founderId: user.id,
      taskId,
      type: 'comment',
      actor: 'system',
      payload: { kind: 'clarify', count: questions.length },
    })
  } catch {
    // best-effort — audit failure must not block the response
  }

  return NextResponse.json({ questions }, { status: 200 })
}
