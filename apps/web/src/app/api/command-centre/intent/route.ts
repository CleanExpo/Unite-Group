// src/app/api/command-centre/intent/route.ts
//
// Capture Intent (AI-Native SDLC Stage 1).
//
// POST /api/command-centre/intent { taskId }
//   Drafts an intent.md from the task's idea + metadata.clarifications and saves
//   it as metadata.intent = { status: 'draft', markdown, generatedAt }.
//   Model failure → 502 with the reason; nothing is saved.
//
// PUT /api/command-centre/intent { taskId, markdown }
//   Validates the founder-edited markdown (400 with the reason if incomplete,
//   nothing saved), rewrites the frontmatter to status: accepted / author /
//   created / task, and saves metadata.intent = { status: 'accepted', markdown,
//   acceptedAt, author }.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import {
  generateIntent,
  parseIntentMarkdown,
  renderIntentMarkdown,
  setIntentStatus,
  type IntentClarifications,
} from '@/lib/command-centre/intent'

export const dynamic = 'force-dynamic'

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Body validation ───────────────────────────────────────────────────────
  const body = await readBody(request)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) {
    return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  }

  // ── Task lookup (founder-scoped) ──────────────────────────────────────────
  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // ── Draft ─────────────────────────────────────────────────────────────────
  const idea = [task.title, task.objective].filter((part) => typeof part === 'string' && part.trim()).join('\n\n')
  const clarifications = task.metadata?.clarifications as IntentClarifications | undefined
  const result = await generateIntent(idea, clarifications)
  if (!result.ok) {
    return NextResponse.json({ error: `Could not draft intent.md: ${result.reason}` }, { status: 502 })
  }

  const generatedAt = new Date().toISOString()
  const markdown = renderIntentMarkdown(result.doc, {
    author: user.email ?? user.id,
    status: 'draft',
    createdAt: generatedAt,
    taskId,
  })

  const persisted = await mergeTaskMetadata({
    founderId: user.id,
    taskId,
    patch: { intent: { status: 'draft', markdown, generatedAt } },
  })
  if (!persisted) {
    return NextResponse.json({ error: 'Failed to persist intent draft' }, { status: 500 })
  }

  return NextResponse.json({ markdown }, { status: 200 })
}

export async function PUT(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Body validation ───────────────────────────────────────────────────────
  const body = await readBody(request)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) {
    return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  }
  if (typeof body.markdown !== 'string' || !body.markdown.trim()) {
    return NextResponse.json({ error: 'Field "markdown" is required' }, { status: 400 })
  }

  const parsed = parseIntentMarkdown(body.markdown)
  if (!parsed.ok) {
    return NextResponse.json({ error: `intent.md is incomplete: ${parsed.reason}` }, { status: 400 })
  }

  // ── Task lookup (founder-scoped) ──────────────────────────────────────────
  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // ── Accept: rewrite frontmatter and persist ───────────────────────────────
  const acceptedAt = new Date().toISOString()
  const author = user.email ?? user.id
  const markdown = setIntentStatus(body.markdown, { status: 'accepted', author, createdAt: acceptedAt, taskId })

  const persisted = await mergeTaskMetadata({
    founderId: user.id,
    taskId,
    patch: { intent: { status: 'accepted', markdown, acceptedAt, author } },
  })
  if (!persisted) {
    return NextResponse.json({ error: 'Failed to persist accepted intent' }, { status: 500 })
  }

  // ── Append audit event (best-effort; does not fail the route) ────────────
  try {
    await appendTaskEvent({
      founderId: user.id,
      taskId,
      type: 'comment',
      actor: 'founder',
      payload: { kind: 'intent_accepted' },
    })
  } catch {
    // best-effort — audit failure must not block the response
  }

  return NextResponse.json({ markdown, acceptedAt }, { status: 200 })
}
