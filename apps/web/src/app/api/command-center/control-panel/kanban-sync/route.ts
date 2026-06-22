// /api/command-center/control-panel/kanban-sync
//
// GET  → packets for cc_tasks that still need a Kanban sync (founder-scoped).
// POST → marks the supplied task ids as synced (writes metadata.kanban_synced_at).
//
// Ported from apps/authority-legacy, which tracked sync state in a dedicated
// `tasks.obsidian_synced_at` column on a workspace-scoped table. cc_tasks has
// no such column, so sync state is recorded in the existing `metadata` JSONB
// (metadata.kanban_synced_at). Everything is founder-scoped: getUser() →
// cc_tasks WHERE founder_id = auth.uid(). No workspace_id.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import {
  listTasks,
  CC_TASKS_TABLE,
  type CommandCentreTask,
  type SupabaseLike,
} from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

const SENSITIVE_ASSIGNMENT_KEY = String.raw`(?:[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|SERVICE_ROLE_KEY)[A-Z0-9_]*)`

function redactSensitiveText(value: string): string {
  return value
    .replace(new RegExp(`\\b(${SENSITIVE_ASSIGNMENT_KEY})\\s*=\\s*(["'])(.*?)\\2`, 'gi'), '$1=$2[REDACTED]$2')
    .replace(new RegExp(`\\b(${SENSITIVE_ASSIGNMENT_KEY})\\s*=\\s*[^\\s;,]+`, 'gi'), '$1=[REDACTED]')
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED]')
    .replace(/\bBOARD-[A-Za-z0-9-]+\b/g, '[REDACTED]')
    .replace(/\b(Bearer\s+)?[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi, '$1[REDACTED]')
    .replace(/\+?61[\s-]?(?:\(?0?\d\)?[\s-]?){8,9}\b/g, '[REDACTED]')
    .replace(/\b(?:card\s+(?:ending|ending in|last four)|ending)\s+\d{4}\b/gi, '[REDACTED]')
}

function metadataString(task: CommandCentreTask, key: string): string | null {
  const raw = (task.metadata as Record<string, unknown>)?.[key]
  return typeof raw === 'string' ? raw : null
}

function metadataTags(task: CommandCentreTask): string[] {
  const raw = (task.metadata as Record<string, unknown>)?.tags
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is string => typeof t === 'string')
}

function syncDue(task: CommandCentreTask): boolean {
  if (task.status.toLowerCase() === 'done') return false
  const syncedAt = metadataString(task, 'kanban_synced_at')
  if (!syncedAt) return true
  const updatedAt = task.updated_at ?? task.created_at
  if (!updatedAt) return true
  return new Date(updatedAt).getTime() > new Date(syncedAt).getTime()
}

function laneFor(task: CommandCentreTask): string {
  const tags = metadataTags(task)
  if (tags.includes('margot-voice')) return 'voice-intake'
  if (tags.includes('cc-addon-request')) return 'add-on-approval'
  if (tags.includes('approval-required') || task.status === 'awaiting_approval') return 'approval-gate'
  return 'cc-task'
}

function bodyFor(task: CommandCentreTask): string {
  return [
    redactSensitiveText(task.objective || task.title),
    '',
    `CC task: ${task.id}`,
    `CC status: ${task.status}`,
    `Priority: ${task.priority}`,
    `Owner: ${task.agent_owner ?? 'unassigned'}`,
    '',
    'Safety gates:',
    '- The command centre remains source of truth.',
    '- No Kanban done state without evidence attached to the cc task.',
    '- Synthex receives only marketing/campaign work.',
  ].join('\n')
}

function toSyncPacket(task: CommandCentreTask) {
  const safeTitle = redactSensitiveText(task.title)
  return {
    ccTaskId: task.id,
    idempotencyKey: `cc-task-${task.id}`,
    title: safeTitle,
    lane: laneFor(task),
    status: task.status,
    priority: task.priority,
    assignee: task.agent_owner ?? 'Pi-CEO',
    tags: metadataTags(task),
    updatedAt: task.updated_at ?? task.created_at,
    kanban: {
      title: safeTitle,
      body: bodyFor(task),
      status: task.status === 'blocked' || task.status === 'awaiting_approval' ? 'blocked' : 'triage',
      priority: task.priority === 'P0' || task.priority === 'P1' ? 100 : 80,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const all = await listTasks({ founderId: user.id, limit: 100 })
    const packets = all.filter(syncDue).map(toSyncPacket)
    return json({
      source: 'cc:kanban-sync',
      generatedAt: new Date().toISOString(),
      pendingCount: packets.length,
      tasks: packets,
    })
  } catch {
    return json({ error: 'cc_unavailable' }, 503)
  }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  if (!isRecord(body) || !Array.isArray(body.taskIds)) {
    return json({ error: 'invalid_packet' }, 400)
  }

  const taskIds = body.taskIds.filter((id): id is string => typeof id === 'string' && !!id.trim())
  if (taskIds.length === 0) return json({ error: 'invalid_packet' }, 400)

  const syncedAt = typeof body.syncedAt === 'string' ? body.syncedAt : new Date().toISOString()

  try {
    const all = await listTasks({ founderId: user.id, limit: 100 })
    const toUpdate = all.filter((t) => taskIds.includes(t.id))

    if (toUpdate.length > 0) {
      const db = (await createClient()) as unknown as SupabaseLike
      for (const task of toUpdate) {
        const nextMetadata = {
          ...(task.metadata as Record<string, unknown>),
          kanban_synced_at: syncedAt,
        }
        const { error } = await db
          .from(CC_TASKS_TABLE)
          .update({ metadata: nextMetadata })
          .eq('founder_id', user.id)
          .eq('id', task.id)
          .select('id')
          .single()
        if (error) return json({ error: 'cc_update_failed' }, 500)
      }
    }

    return json({ ok: true, syncedAt, taskIds: toUpdate.map((t) => t.id) })
  } catch {
    return json({ error: 'cc_unavailable' }, 503)
  }
}
