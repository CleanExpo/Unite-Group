// src/app/api/command-centre/intent/route.ts
//
// Capture Intent (AI-Native SDLC Stage 1).
//
// POST /api/command-centre/intent { taskId }
//   Drafts an intent.md. For a delivery mission the source is the mission's own
//   contract (originalIdea, question labels + answers, projectKey); otherwise
//   the task title/objective + metadata.clarifications. Saved as
//   metadata.intent = { status: 'draft', markdown, generatedAt }.
//   Model failure → 502 with the reason; nothing is saved.
//
// PUT /api/command-centre/intent { taskId, markdown }
//   Validates the founder-edited markdown (400 with the reason if incomplete,
//   nothing saved), rewrites the frontmatter to status: accepted / author /
//   created / task, and saves metadata.intent = { status: 'accepted', markdown,
//   acceptedAt, author }.
//
// Delivery missions are written ONLY through the guarded saveMissionIntent
// compare-and-swap (409 on conflict, or while a preparation lease is live);
// mergeTaskMetadata is used only for non-delivery tasks.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent, type CommandCentreTask } from '@/lib/command-centre/tasks'
import { isDeliveryMission, readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { DeliveryConflict } from '@/lib/command-centre/delivery-store'
import { saveMissionIntent, isPreparationLeaseActive, type MissionIntent } from '@/lib/command-centre/intent-store'
import {
  generateIntent,
  parseIntentMarkdown,
  renderIntentMarkdown,
  setIntentStatus,
  type IntentClarifications,
} from '@/lib/command-centre/intent'

export const dynamic = 'force-dynamic'

const CONFLICT_MESSAGE = 'This mission changed while you were working. Reload it and try again.'
const PREPARING_MESSAGE = 'Margot is still preparing this mission. Wait for her to finish, reload and try again.'

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** The founder's words and answers for this task, from the mission contract when there is one. */
function intentSource(task: CommandCentreTask): { idea: string; clarifications: IntentClarifications | undefined } {
  const delivery = readDeliveryMetadata(task)
  if (delivery) {
    const questions = delivery.questions.map((q) => q.label)
    const answers = Object.fromEntries(delivery.questions.map((q) => [q.label, delivery.answers[q.id] ?? '']))
    const idea = delivery.projectKey
      ? `${delivery.originalIdea}\n\nBusiness / project: ${delivery.projectKey}`
      : delivery.originalIdea
    return { idea, clarifications: { questions, answers } }
  }
  const idea = [task.title, task.objective].filter((part) => typeof part === 'string' && part.trim()).join('\n\n')
  return { idea, clarifications: task.metadata?.clarifications as IntentClarifications | undefined }
}

/** Persist metadata.intent; returns a response on failure, null on success. */
async function persistIntent(founderId: string, task: CommandCentreTask, intent: MissionIntent): Promise<NextResponse | null> {
  if (isDeliveryMission(task)) {
    if (isPreparationLeaseActive(task)) return NextResponse.json({ error: PREPARING_MESSAGE }, { status: 409 })
    try {
      await saveMissionIntent(task, intent)
      return null
    } catch (error) {
      if (error instanceof DeliveryConflict) return NextResponse.json({ error: CONFLICT_MESSAGE }, { status: 409 })
      return NextResponse.json({ error: 'Failed to persist intent' }, { status: 500 })
    }
  }
  const persisted = await mergeTaskMetadata({ founderId, taskId: task.id, patch: { intent } })
  return persisted ? null : NextResponse.json({ error: 'Failed to persist intent' }, { status: 500 })
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
  if (isDeliveryMission(task) && isPreparationLeaseActive(task)) {
    return NextResponse.json({ error: PREPARING_MESSAGE }, { status: 409 })
  }

  // ── Draft ─────────────────────────────────────────────────────────────────
  const { idea, clarifications } = intentSource(task)
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

  // The model call took time: persist against a fresh read so the CAS compares current state.
  const fresh = await getTaskById({ founderId: user.id, taskId })
  if (!fresh) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const failure = await persistIntent(user.id, fresh, { status: 'draft', markdown, generatedAt })
  if (failure) return failure

  return NextResponse.json({ markdown, generatedAt }, { status: 200 })
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

  const failure = await persistIntent(user.id, task, { status: 'accepted', markdown, acceptedAt, author })
  if (failure) return failure

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
