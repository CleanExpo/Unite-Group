// src/app/api/command-centre/classify/route.ts
//
// POST /api/command-centre/classify
//
// Loads a founder's task, builds an IdeaContext from task.objective +
// task.metadata.clarifications, calls classifyIdea, persists the routing
// decision to metadata.routing (with decidedAt), and returns { routing }.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { classifyIdea } from '@/lib/command-centre/classify-idea'

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
  if (!taskId) return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })

  // ── Task lookup (founder-scoped) ──────────────────────────────────────────
  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // ── Build IdeaContext defensively ─────────────────────────────────────────
  const clar = (task.metadata?.clarifications ?? { questions: [], answers: {} }) as {
    questions: string[]
    answers: Record<string, string>
  }
  const routing = await classifyIdea({
    idea: task.objective,
    clarifications: {
      questions: clar.questions ?? [],
      answers: clar.answers ?? {},
    },
  })

  // ── Persist routing to metadata ───────────────────────────────────────────
  await mergeTaskMetadata({
    founderId: user.id,
    taskId,
    patch: { routing: { ...routing, decidedAt: new Date().toISOString() } },
  })

  // ── Append audit event (best-effort; does not fail the route) ────────────
  try {
    await appendTaskEvent({
      founderId: user.id,
      taskId,
      type: 'comment',
      actor: 'system',
      payload: { kind: 'routed', lane: routing.lane, confidence: routing.confidence },
    })
  } catch {
    // best-effort — audit failure must not block the response
  }

  return NextResponse.json({ routing }, { status: 200 })
}
