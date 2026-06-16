import type { CommandCentreTask, TaskStatus } from './tasks'
import type { ExecutionSession, SessionSurface } from './sessions'

export type OperationNodeState = 'working' | 'queued' | 'blocked' | 'idle'

export interface OperationNode {
  id: string
  label: string
  state: OperationNodeState
  activeSessions: number
  openTasks: number
  blockedTasks: number
  surfaces: SessionSurface[]
  currentTasks: string[]
  lastUpdatedAt: string | null
}

export interface OperationWorkItem {
  id: string
  title: string
  state: TaskStatus
  owner: string
  priority: string
  approvalRequired: boolean
  linearId: string | null
  updatedAt: string
}

export interface OperationShip {
  id: string
  title: string
  owner: string
  surface: SessionSurface | null
  completedAt: string
  evidencePath: string | null
}

export interface LiveAgentOperationsPayload {
  source: 'cc:operations'
  generatedAt: string
  summary: {
    agents: number
    activeSessions: number
    openTasks: number
    blockedTasks: number
    approvalRequired: number
    recentShips: number
  }
  nodes: OperationNode[]
  workQueue: OperationWorkItem[]
  shipFeed: OperationShip[]
  nextAction: string
}

const OPEN_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'proposed',
  'queued',
  'running',
  'blocked',
  'awaiting_approval',
  'failed',
])

function ownerFor(task: CommandCentreTask): string {
  return task.agent_owner?.trim() || 'Pi-CEO'
}

function ownerForSession(taskById: Map<string, CommandCentreTask>, session: ExecutionSession): string {
  const task = taskById.get(session.task_id)
  return task ? ownerFor(task) : session.surface
}

function isOpenTask(task: CommandCentreTask): boolean {
  return OPEN_STATUSES.has(task.status)
}

function isBlockedTask(task: CommandCentreTask): boolean {
  return task.status === 'blocked' || task.status === 'failed' || task.status === 'awaiting_approval'
}

function isActiveSession(session: ExecutionSession): boolean {
  return session.status === 'running' || session.status === 'paused'
}

function maxIso(values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => typeof value === 'string' && value.length > 0)
  if (valid.length === 0) return null
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
}

function nodeState(args: {
  activeSessions: number
  runningTasks: number
  queuedTasks: number
  blockedTasks: number
}): OperationNodeState {
  if (args.blockedTasks > 0) return 'blocked'
  if (args.activeSessions > 0 || args.runningTasks > 0) return 'working'
  if (args.queuedTasks > 0) return 'queued'
  return 'idle'
}

function buildNextAction(summary: LiveAgentOperationsPayload['summary']): string {
  if (summary.blockedTasks > 0) return `Clear ${summary.blockedTasks} blocked or failed command task${summary.blockedTasks === 1 ? '' : 's'}.`
  if (summary.approvalRequired > 0) return `Review ${summary.approvalRequired} approval gate${summary.approvalRequired === 1 ? '' : 's'} before agents proceed.`
  if (summary.openTasks > summary.activeSessions) return 'Start or assign the next queued task to an available senior agent.'
  if (summary.activeSessions > 0) return 'Monitor active sessions through evidence, validation, and completion.'
  return 'Queue is clear. Capture the next business idea or research request.'
}

function uniqueSurfaces(sessions: ExecutionSession[]): SessionSurface[] {
  return Array.from(new Set(sessions.map((session) => session.surface))).sort()
}

export function buildLiveAgentOperations(
  tasks: CommandCentreTask[],
  sessions: ExecutionSession[],
  now: Date = new Date(),
): LiveAgentOperationsPayload {
  const openTasks = tasks.filter(isOpenTask)
  const activeSessions = sessions.filter(isActiveSession)
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const owners = Array.from(
    new Set([...openTasks.map(ownerFor), ...activeSessions.map((session) => ownerForSession(taskById, session))]),
  ).sort()

  const nodes: OperationNode[] = owners.map((owner) => {
    const ownedTasks = openTasks.filter((task) => ownerFor(task) === owner)
    const ownedSessions = activeSessions.filter((session) => {
      const task = taskById.get(session.task_id)
      return task ? ownerFor(task) === owner : session.surface === owner
    })
    const blockedTasks = ownedTasks.filter(isBlockedTask).length
    const runningTasks = ownedTasks.filter((task) => task.status === 'running').length
    const queuedTasks = ownedTasks.filter((task) => task.status === 'queued' || task.status === 'proposed').length

    return {
      id: owner.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unassigned',
      label: owner,
      state: nodeState({
        activeSessions: ownedSessions.length,
        runningTasks,
        queuedTasks,
        blockedTasks,
      }),
      activeSessions: ownedSessions.length,
      openTasks: ownedTasks.length,
      blockedTasks,
      surfaces: uniqueSurfaces(ownedSessions),
      currentTasks: ownedTasks.slice(0, 3).map((task) => task.title),
      lastUpdatedAt: maxIso([
        ...ownedTasks.map((task) => task.updated_at ?? task.created_at),
        ...ownedSessions.map((session) => session.ended_at ?? session.started_at),
      ]),
    }
  })

  const workQueue: OperationWorkItem[] = openTasks
    .slice()
    .sort((a, b) => Date.parse(b.updated_at ?? b.created_at) - Date.parse(a.updated_at ?? a.created_at))
    .slice(0, 8)
    .map((task) => ({
      id: task.linear_id ?? task.external_ref ?? task.id,
      title: task.title,
      state: task.status,
      owner: ownerFor(task),
      priority: task.priority,
      approvalRequired: task.human_approval_required || task.status === 'awaiting_approval',
      linearId: task.linear_id,
      updatedAt: task.updated_at ?? task.created_at,
    }))

  const doneSessions = sessions.filter((session) => session.status === 'done')
  const shipFeed: OperationShip[] = tasks
    .filter((task) => task.status === 'done')
    .slice()
    .sort((a, b) => Date.parse(b.updated_at ?? b.created_at) - Date.parse(a.updated_at ?? a.created_at))
    .slice(0, 8)
    .map((task) => {
      const session = doneSessions.find((candidate) => candidate.task_id === task.id)
      return {
        id: task.id,
        title: task.title,
        owner: ownerFor(task),
        surface: session?.surface ?? null,
        completedAt: task.updated_at ?? task.created_at,
        evidencePath: task.evidence_path,
      }
    })

  const summary = {
    agents: nodes.length,
    activeSessions: activeSessions.length,
    openTasks: openTasks.length,
    blockedTasks: openTasks.filter(isBlockedTask).length,
    approvalRequired: openTasks.filter((task) => task.human_approval_required || task.status === 'awaiting_approval').length,
    recentShips: shipFeed.length,
  }

  return {
    source: 'cc:operations',
    generatedAt: now.toISOString(),
    summary,
    nodes,
    workQueue,
    shipFeed,
    nextAction: buildNextAction(summary),
  }
}
