// GET /api/command-centre/control-panel
//
// Founder Command Center control panel — reconciles the static workstream +
// add-on registry seed against the founder's live cc_tasks rows.
//
// Ported from apps/authority-legacy (which queried a generic, workspace-scoped
// `tasks` table). Here it is founder-scoped: getUser() → cc_tasks WHERE
// founder_id = auth.uid(). No workspace_id, no organisation_id. When the
// founder has no matching cc_tasks the cards stay on the static seed and the
// response source flips to a `fallback:*` value so the UI shows an honest
// degraded/seed state — never seed values dressed up as live.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { listTasks, type CommandCentreTask } from '@/lib/command-centre/tasks'
import {
  ADD_ON_GATES,
  CONTROL_WORKSTREAMS,
  type AddOnGate,
  type ControlRyg,
  type ControlStatus,
  type ControlWorkstream,
} from '@/components/command-center/control-panel/control-panel-data'
import { addOnExternalRef } from './add-ons/_cc-task-shape'

export const dynamic = 'force-dynamic'

type LiveWorkstream = ControlWorkstream & {
  ccTaskId?: string
  ccTaskStatus?: string
  lastUpdated?: string
}

type LiveAddOnGate = AddOnGate & {
  ccTaskId?: string
  ccTaskStatus?: string
  lastRequestedAt?: string
}

// Keyword matchers map a workstream card to the founder's cc_tasks by title.
const WORKSTREAM_MATCHERS: Record<string, string[]> = {
  'ug-v0-01': ['plaud', 'intake', 'transcript', 'margot brief'],
  'ug-v0-02': ['margot-voice', 'voice/', 'command-centre task', 'cc task'],
  'ug-v0-03': ['kanban', 'cc to kanban', 'execution spine'],
  'ug-v0-04': ['synthex', 'marketing only', 'routing'],
  'ug-v0-05': ['add-on', 'addon', 'registry', 'approval gate'],
  'ug-v0-06': ['hermes update scout', 'update scout', 'scout automation'],
  'ug-v0-07': ['portfolio ryg', 'dashboard', 'source matrix'],
}

function taskTags(task: CommandCentreTask): string[] {
  const raw = (task.metadata as Record<string, unknown>)?.tags
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is string => typeof t === 'string')
}

function taskHaystack(task: CommandCentreTask): string {
  return [
    task.title,
    task.status,
    task.priority,
    task.agent_owner ?? '',
    task.external_ref ?? '',
    ...taskTags(task),
  ]
    .join(' ')
    .toLowerCase()
}

function findTaskForWorkstream(id: string, tasks: CommandCentreTask[]) {
  const terms = WORKSTREAM_MATCHERS[id] ?? []
  return tasks.find((task) => {
    const haystack = taskHaystack(task)
    return terms.some((term) => haystack.includes(term))
  })
}

function mapStatus(task: CommandCentreTask | undefined, fallback: ControlStatus): ControlStatus {
  if (!task) return fallback
  const status = task.status.trim().toLowerCase()
  if (['done'].includes(status)) return 'live'
  if (['blocked', 'awaiting_approval'].includes(status)) return 'gated'
  if (['queued', 'running', 'proposed'].includes(status)) return 'building'
  return fallback
}

function mapRyg(task: CommandCentreTask | undefined, fallback: ControlRyg): ControlRyg {
  if (!task) return fallback
  const status = task.status.trim().toLowerCase()
  if (['blocked', 'failed'].includes(status) || task.risk_level === 'critical') return 'red'
  if (status === 'done') return 'green'
  return 'yellow'
}

function isApprovalRequiredTask(task: CommandCentreTask): boolean {
  const status = task.status.trim().toLowerCase()
  return status === 'awaiting_approval' || status === 'blocked' || task.human_approval_required === true
}

function countApprovalRequired(tasks: CommandCentreTask[]): number {
  return tasks.filter(isApprovalRequiredTask).length
}

function mergeWorkstreams(tasks: CommandCentreTask[]): LiveWorkstream[] {
  return CONTROL_WORKSTREAMS.map((item) => {
    const task = findTaskForWorkstream(item.id, tasks)
    if (!task) return item
    return {
      ...item,
      status: mapStatus(task, item.status),
      ryg: mapRyg(task, item.ryg),
      owner: task.agent_owner || item.owner,
      ccTaskId: task.id,
      ccTaskStatus: task.status,
      lastUpdated: task.updated_at ?? task.created_at ?? undefined,
    }
  })
}

function mergeAddOns(tasks: CommandCentreTask[]): LiveAddOnGate[] {
  return ADD_ON_GATES.map((item) => {
    const ref = addOnExternalRef(item.id)
    const task = tasks.find((row) => row.external_ref === ref)
    if (!task) return item
    return {
      ...item,
      state: mapStatus(task, item.state),
      ccTaskId: task.id,
      ccTaskStatus: task.status,
      lastRequestedAt: task.updated_at ?? task.created_at ?? undefined,
    }
  })
}

function responseFor(
  workstreams: LiveWorkstream[],
  source: string,
  taskCount = 0,
  addOns: LiveAddOnGate[] = ADD_ON_GATES,
  approvalRequired = 0,
) {
  return NextResponse.json(
    {
      source,
      taskCount,
      generatedAt: new Date().toISOString(),
      summary: {
        green: workstreams.filter((item) => item.ryg === 'green').length,
        yellow: workstreams.filter((item) => item.ryg === 'yellow').length,
        red: workstreams.filter((item) => item.ryg === 'red').length,
        approvalRequired,
      },
      workstreams,
      addOns,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const tasks = await listTasks({ founderId: user.id, limit: 100 })
    if (tasks.length === 0) {
      return responseFor(CONTROL_WORKSTREAMS, 'fallback:no_tasks')
    }
    return responseFor(
      mergeWorkstreams(tasks),
      'cc:tasks',
      tasks.length,
      mergeAddOns(tasks),
      countApprovalRequired(tasks),
    )
  } catch {
    return responseFor(CONTROL_WORKSTREAMS, 'fallback:cc_unavailable')
  }
}
