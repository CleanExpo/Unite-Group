// POST /api/kanban/generate-next
// The [Apply] button: generate the next tasks for a board stage (Today/Hot/
// Pipeline/Someday). Phill's rule — the model ingests the FULL project scope
// (name + 2-sentence description) before proposing work. Generated tasks are
// created as labelled Linear issues, which the autopilot CLI (Max plan) then
// claims and builds → PR. So [Apply] = describe scope → generate → push to
// the production execution pipeline.

import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getUser } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/client'
import { createIssue, resolveOrCreateLabelIds } from '@/lib/integrations/linear'

export const dynamic = 'force-dynamic'

const MODEL = 'claude-sonnet-4-5-20250929'
const HERMES_LABELS = ['mesh:auto', 'pi-dev:autonomous', 'source:hermes-kanban']

// The project the generator must understand before proposing work.
const PROJECT = {
  name: 'Unite-Group Nexus — Mission Control',
  description:
    'A single-founder command centre that orchestrates AI agents across the Unite-Group portfolio (the Nexus CRM, the Synthex marketing engine, and the autopilot build runner). The founder describes work in plain English; the system routes it to the right AI provider, builds it on a branch, and ships it via PR behind human approval gates.',
}

const STAGE_INTENT: Record<string, string> = {
  today: 'concrete tasks to execute right now, this session — small, shippable, unblock-the-founder work',
  hot: 'urgent, high-priority items and active blockers that must be handled before anything else',
  pipeline: 'near-term planned work, ready to be picked up next once current work clears',
  someday: 'backlog ideas and future considerations worth capturing but not yet scheduled',
}

interface GeneratedTask { title: string; context: string; acceptance: string[] }

function parseTasks(text: string): GeneratedTask[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const arr = JSON.parse(match[0]) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((t): t is { title: string } => Boolean(t) && typeof (t as { title?: unknown }).title === 'string' && (t as { title: string }).title.trim().length > 0)
      .map((t) => {
        const raw = t as { title: string; context?: unknown; acceptance?: unknown }
        const acceptance = (Array.isArray(raw.acceptance)
          ? raw.acceptance.map((a) => String(a).trim())
          : typeof raw.acceptance === 'string'
            ? [raw.acceptance.trim()]
            : []
        ).filter(Boolean).map((a) => a.slice(0, 300)).slice(0, 6)
        return {
          title: String(raw.title).trim().slice(0, 200),
          context: String(raw.context ?? '').trim().slice(0, 600),
          acceptance,
        }
      })
      .slice(0, 5)
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let column = 'today'
  let existingTitles: string[] = []
  try {
    const body = (await request.json()) as { column?: string; existingTitles?: string[] }
    if (body.column && STAGE_INTENT[body.column]) column = body.column
    if (Array.isArray(body.existingTitles)) existingTitles = body.existingTitles.slice(0, 40).map((t) => String(t).slice(0, 120))
  } catch {
    // defaults
  }

  const prompt = [
    `Project: ${PROJECT.name}`,
    `What it does: ${PROJECT.description}`,
    '',
    `Generate the NEXT tasks for the "${column.toUpperCase()}" stage of the founder's execution board.`,
    `"${column.toUpperCase()}" means: ${STAGE_INTENT[column]}.`,
    existingTitles.length
      ? `Already on the board — do NOT duplicate these:\n- ${existingTitles.join('\n- ')}`
      : 'This stage is currently empty.',
    '',
    'Propose 3–5 high-leverage, specific, non-duplicate tasks for THIS project at THIS stage. Each must be independently actionable by an autonomous coding agent: a clear scope and 2–4 verifiable acceptance criteria (concrete, checkable done-conditions).',
    'Return ONLY a JSON array (no prose, no markdown fences): [{"title":"…","context":"1 sentence describing the scope","acceptance":["a verifiable done-condition","another checkable result"]}]',
  ].join('\n')

  let text: string
  try {
    const response = await getAIClient().messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'AI generation failed' }, { status: 502 })
  }

  const tasks = parseTasks(text)
  if (tasks.length === 0) {
    return NextResponse.json({ error: 'The model did not return usable tasks — try again.' }, { status: 502 })
  }

  // Ensure the autopilot labels exist, then create each task as a labelled Linear
  // issue — the autopilot CLI (Max plan) claims these labels and builds them.
  try {
    await resolveOrCreateLabelIds(HERMES_LABELS)
  } catch {
    // best-effort: createIssue will still attach whatever labels resolve
  }

  const created: Array<{ identifier: string; url?: string; title: string }> = []
  for (const t of tasks) {
    try {
      const issue = await createIssue({
        teamKey: 'UNI',
        title: t.title,
        description: [
          t.context,
          '',
          // REQUIRED: the autopilot claim filter (linear-claim.ts hasAcceptanceCriteria)
          // only claims issues that carry an "Acceptance Criteria" heading. Without
          // it the runner skips the task as `no-acceptance-criteria` and never builds
          // it. Fall back to the scope sentence so the heading always has content.
          '## Acceptance Criteria',
          ...(t.acceptance.length ? t.acceptance : [t.context]).map((a) => `- ${a}`),
          '',
          `Generated by [Apply] for the ${column.toUpperCase()} stage of ${PROJECT.name}.`,
          'Source: Hermes Kanban (Founder OS)',
          `Autonomy labels: ${HERMES_LABELS.join(', ')}`,
        ].join('\n'),
        priority: column === 'hot' ? 2 : column === 'today' ? 3 : 4,
        labelNames: HERMES_LABELS,
      })
      created.push({ identifier: issue.id, url: issue.url, title: t.title })
    } catch (err) {
      console.error('[generate-next] Linear issue create failed:', err instanceof Error ? err.message : err)
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: 'Generated tasks but could not create them in Linear — check LINEAR_API_KEY.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ column, generated: tasks.length, created })
}
