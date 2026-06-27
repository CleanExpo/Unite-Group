// POST /api/command-centre/control-panel/add-ons
//
// Files (or returns the existing) founder-scoped approval task for an add-on
// gate. Ported from apps/authority-legacy, which wrote to a workspace-scoped
// `tasks` table with a buggy assignee_type enum. Here the approval gate is
// native to cc_tasks:
//
//   status = 'awaiting_approval', human_approval_required = true,
//   external_ref = `cc-addon:<id>` (UNIQUE(founder_id, external_ref) →
//   idempotency, so a second click returns the open task instead of dupes).
//
// Auth: getUser() (Supabase session). Founder-scoped. No add-on can
// self-enable — the task lands awaiting the founder's approval, nothing
// executes here.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createTask, listTasks, type CommandCentreTask } from '@/lib/command-centre/tasks'
import { ADD_ON_GATES } from '@/components/command-centre/control-panel/control-panel-data'
import {
  ADD_ON_APPROVAL_STATUS,
  addOnExternalRef,
} from './_cc-task-shape'

export const dynamic = 'force-dynamic'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function addOnFor(value: unknown) {
  if (!isRecord(value) || typeof value.addOnId !== 'string') return null
  const addOnId = value.addOnId.trim()
  return ADD_ON_GATES.find((item) => item.id === addOnId) ?? null
}

function taskObjective(addOn: (typeof ADD_ON_GATES)[number]): string {
  return [
    `Review add-on request: ${addOn.label}`,
    '',
    `Category: ${addOn.category}`,
    `Current state: ${addOn.state}`,
    `Approval rule: ${addOn.approval}`,
    'Requested by: authenticated founder',
    '',
    'Safety gates:',
    '- No add-on can self-enable from the Control Panel.',
    '- Approval task stays awaiting_approval until a human decision is recorded.',
    '- Synthex receives only marketing/campaign work.',
    '- The command centre remains the source of truth.',
  ].join('\n')
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const addOn = addOnFor(body)
  if (!addOn) return NextResponse.json({ error: 'invalid_add_on' }, { status: 400 })

  const externalRef = addOnExternalRef(addOn.id)

  // Idempotency: an open approval task for this add-on already filed?
  let existing: CommandCentreTask | undefined
  try {
    const tasks = await listTasks({ founderId: user.id, limit: 100 })
    existing = tasks.find((t) => t.external_ref === externalRef && t.status !== 'done')
  } catch {
    return NextResponse.json({ error: 'cc_lookup_failed' }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json(
      {
        ok: true,
        existing: true,
        cc_task_id: existing.id,
        task_title: existing.title,
        task_status: existing.status,
        requested_at: existing.created_at,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  let created: CommandCentreTask
  try {
    created = await createTask({
      founderId: user.id,
      externalRef,
      title: `Approve add-on: ${addOn.label}`,
      objective: taskObjective(addOn),
      status: ADD_ON_APPROVAL_STATUS,
      priority: 'P1',
      origin: 'idea',
      agentOwner: 'Margot',
      humanApprovalRequired: true,
      metadata: {
        addOnId: addOn.id,
        category: addOn.category,
        source: 'command_center_add_on_request',
        tags: ['cc-addon-request', 'approval-required', addOn.id, addOn.category],
      },
    })
  } catch {
    return NextResponse.json({ error: 'cc_task_insert_failed' }, { status: 500 })
  }

  return NextResponse.json(
    {
      ok: true,
      existing: false,
      cc_task_id: created.id,
      task_title: created.title,
      task_status: created.status,
      requested_at: created.created_at,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
