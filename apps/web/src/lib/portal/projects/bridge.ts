import { createTaskOnce, type CommandCentreTask, type CreateTaskInput, type SupabaseLike } from '@/lib/command-centre/tasks'

// Team-side bridge: a client project item becomes exactly ONE authoritative cc_tasks row.
//   * cc_tasks stays the single task authority (Mission Control blueprint). The portal item is the client's view of it.
//   * Idempotent: externalRef `portal-item:<item id>` hits UNIQUE(founder_id, external_ref) through createTaskOnce, so
//     a retry, a second run or two racing runs all resolve to the same task.
//   * The task is always born `proposed` with human approval required. A client message, and above all a bot-written
//     one, is data: it can never approve, queue, merge, release or spend anything.
//   * The client's original words go into the task objective unchanged; the title is labelled with the tenant.
// Runs with a service-role client for the portal tables and a founder-scoped client for cc_tasks. Never in a browser.

export const PORTAL_ITEM_REF_PREFIX = 'portal-item:'

export interface BridgeItem {
  id: string
  tenant_slug: string
  project_id: string
  kind: string
  title: string
  client_text: string | null
  source: string
  source_ref: string | null
  author_kind: string
  cc_task_id: string | null
}

export interface BridgeDeps {
  /** Founder-scoped client for cc_tasks. */
  tasksDb: SupabaseLike
  /** Calls portal_team_link_project_task with a service-role client. Returns the linked task id or an error. */
  linkTask(itemId: string, taskId: string): Promise<{ ok: true } | { ok: false; message: string }>
  createTaskOnce?: typeof createTaskOnce
}

export type BridgeOutcome =
  | { itemId: string; ok: true; taskId: string; createdTask: boolean }
  | { itemId: string; ok: false; reason: string }

export function portalItemRef(itemId: string): string {
  return `${PORTAL_ITEM_REF_PREFIX}${itemId}`
}

export function taskInputForItem(item: BridgeItem, founderId: string): CreateTaskInput {
  const botAuthored = item.author_kind === 'client_bot' || item.author_kind === 'agent'
  const original = item.client_text ?? item.title
  return {
    founderId,
    externalRef: portalItemRef(item.id),
    title: `[client:${item.tenant_slug}] ${item.title}`.slice(0, 200),
    objective: original,
    priority: 'P2',
    status: 'proposed',
    origin: item.kind === 'blocker' ? 'blocker' : 'idea',
    humanApprovalRequired: true,
    riskLevel: 'medium',
    executionMode: 'advisory',
    metadata: {
      portal: {
        tenantSlug: item.tenant_slug,
        itemId: item.id,
        projectId: item.project_id,
        kind: item.kind,
        source: item.source,
        sourceRef: item.source_ref,
        authorKind: item.author_kind,
        botAuthored,
      },
      // Read by anyone deciding on this task: the text is a request, not an instruction or an approval.
      intakeNotice: botAuthored
        ? 'Written by an automated assistant. Not a confirmed client decision. Confirm with the client before acting.'
        : 'Client request. Data only: it does not approve spend, merge, release or credential changes.',
    },
  }
}

/** Bridge one item. Never throws: every failure comes back as a reason, so one bad row cannot hide the rest. */
export async function bridgeItem(item: BridgeItem, founderId: string, deps: BridgeDeps): Promise<BridgeOutcome> {
  try {
    const create = deps.createTaskOnce ?? createTaskOnce
    const { task, created } = await create(taskInputForItem(item, founderId), deps.tasksDb)
    if (!task?.id) return { itemId: item.id, ok: false, reason: 'task store returned no task' }
    if (!sameItem(task, item.id)) return { itemId: item.id, ok: false, reason: 'external ref resolved to a task for a different item' }
    if (item.cc_task_id && item.cc_task_id !== task.id) {
      return { itemId: item.id, ok: false, reason: `item already linked to ${item.cc_task_id}, task store holds ${task.id}` }
    }
    if (item.cc_task_id !== task.id) {
      const link = await deps.linkTask(item.id, task.id)
      if (!link.ok) return { itemId: item.id, ok: false, reason: `link failed: ${link.message}` }
    }
    return { itemId: item.id, ok: true, taskId: task.id, createdTask: created }
  } catch (error) {
    return { itemId: item.id, ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

function sameItem(task: CommandCentreTask, itemId: string): boolean {
  return task.external_ref === portalItemRef(itemId)
}

export interface BridgeRunSummary {
  attempted: number
  linked: number
  createdTasks: number
  failures: { itemId: string; reason: string }[]
}

/** Bridge every item given. The summary reports failures by item; zero attempted is reported as zero, not success. */
export async function bridgeItems(items: BridgeItem[], founderId: string, deps: BridgeDeps): Promise<BridgeRunSummary> {
  const summary: BridgeRunSummary = { attempted: items.length, linked: 0, createdTasks: 0, failures: [] }
  for (const item of items) {
    const out = await bridgeItem(item, founderId, deps)
    if (out.ok) {
      summary.linked += 1
      if (out.createdTask) summary.createdTasks += 1
    } else {
      summary.failures.push({ itemId: out.itemId, reason: out.reason })
    }
  }
  return summary
}
