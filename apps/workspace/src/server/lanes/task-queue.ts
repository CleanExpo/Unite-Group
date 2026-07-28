import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseLaneMissionInput } from './types'
import type { NexusWorkerId } from './worker-registry'

export type NexusTaskStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'blocked'

export interface NexusTaskEvidence {
  runUri?: string
  eventsUri?: string
  commitSha?: string
}

/** Private durable task record. The mission must never be returned by an API. */
export interface NexusTask {
  id: string
  laneId: string
  workerId: NexusWorkerId
  mission: string
  status: NexusTaskStatus
  createdAt: number
  updatedAt: number
  runId?: string
  blockedReason?: string
  evidence?: NexusTaskEvidence
}

export type PublicNexusTask = Omit<NexusTask, 'mission'>

export interface EnqueueTaskInput {
  laneId: string
  workerId: NexusWorkerId
  mission: string
}

export interface SettleTaskInput {
  status: Exclude<NexusTaskStatus, 'pending' | 'running'>
  runId?: string
  blockedReason?: string
  evidence?: NexusTaskEvidence
}

export interface NexusTaskQueue {
  enqueue: (input: EnqueueTaskInput) => Promise<PublicNexusTask>
  list: () => Promise<Array<PublicNexusTask>>
  claimNext: (workerId: NexusWorkerId) => Promise<NexusTask | null>
  settle: (id: string, input: SettleTaskInput) => Promise<PublicNexusTask>
  reconcileInterrupted: () => Promise<number>
}

interface QueueDeps {
  queuePath: string
  idgen?: () => string
  now?: () => number
}

const TASK_STATUSES: ReadonlyArray<NexusTaskStatus> = [
  'pending',
  'running',
  'completed',
  'failed',
  'blocked',
]
const WORKER_IDS: ReadonlyArray<NexusWorkerId> = [
  'claude-cli',
  'codex-cli',
  'hermes-gateway',
  'mac-mini-tailscale',
]
const LOCK_TIMEOUT_MS = 5_000
const SENSITIVE_MISSION_PATTERNS: ReadonlyArray<RegExp> = [
  /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/i,
  /\bauthorization\s*[:=]\s*(?:bearer|basic)\s+\S+/i,
  /\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*\S+/i,
  /\b(?:sk-|gh[opusr]_|github_pat_|xox[baprs]-|AKIA|ASIA|AIza|sk_live_|rk_live_|whsec_|gsk_|hf_|lin_api_|sb_secret_|sb_publishable_)[A-Za-z0-9._-]{8,}/,
  /["']?(?:api[-_]?key|access[-_]?token|refresh[-_]?token|client[-_]?secret|password|secret|token)["']?\s*[:=]\s*["'][^"']{8,}["']/i,
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTask(value: unknown): value is NexusTask {
  if (!isRecord(value)) return false
  if (
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.laneId !== 'string' ||
    !value.laneId ||
    !WORKER_IDS.includes(value.workerId as NexusWorkerId) ||
    typeof value.mission !== 'string' ||
    !value.mission ||
    !TASK_STATUSES.includes(value.status as NexusTaskStatus) ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt)
  ) {
    return false
  }
  if (value.runId !== undefined && typeof value.runId !== 'string') return false
  if (
    value.blockedReason !== undefined &&
    typeof value.blockedReason !== 'string'
  ) {
    return false
  }
  if (value.evidence !== undefined) {
    if (!isRecord(value.evidence)) return false
    for (const key of ['runUri', 'eventsUri', 'commitSha'] as const) {
      if (
        value.evidence[key] !== undefined &&
        typeof value.evidence[key] !== 'string'
      ) {
        return false
      }
    }
  }
  return true
}

function publicTask(task: NexusTask): PublicNexusTask {
  const { mission: _privateMission, ...safe } = task
  return safe
}

export function missionContainsSensitiveValue(mission: string): boolean {
  return SENSITIVE_MISSION_PATTERNS.some((pattern) => pattern.test(mission))
}

async function readTasks(queuePath: string): Promise<Map<string, NexusTask>> {
  const tasks = new Map<string, NexusTask>()
  let raw = ''
  try {
    raw = await fs.readFile(queuePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return tasks
    throw error
  }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    let record: unknown
    try {
      record = JSON.parse(line)
    } catch {
      throw new Error('Nexus task queue contains malformed JSONL')
    }
    if (!isTask(record)) {
      throw new Error('Nexus task queue contains an invalid record')
    }
    tasks.set(record.id, record)
  }
  return tasks
}

async function appendTask(queuePath: string, task: NexusTask): Promise<void> {
  const queueDir = path.dirname(queuePath)
  await fs.mkdir(queueDir, { recursive: true, mode: 0o700 })
  await fs.chmod(queueDir, 0o700)
  await fs.appendFile(queuePath, `${JSON.stringify(task)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
  await fs.chmod(queuePath, 0o600)
}

async function withQueueLock<T>(
  queuePath: string,
  operation: () => Promise<T>,
): Promise<T> {
  const lockPath = `${queuePath}.lock`
  await fs.mkdir(path.dirname(queuePath), { recursive: true, mode: 0o700 })
  const startedAt = Date.now()
  let handle: Awaited<ReturnType<typeof fs.open>> | null = null
  while (!handle) {
    try {
      handle = await fs.open(lockPath, 'wx', 0o600)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (Date.now() - startedAt >= LOCK_TIMEOUT_MS) {
        throw new Error('Nexus task queue lock timed out')
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
  try {
    return await operation()
  } finally {
    await handle.close().catch(() => {})
    await fs.unlink(lockPath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }
}

export function createNexusTaskQueue(deps: QueueDeps): NexusTaskQueue {
  const idgen = deps.idgen ?? (() => `task_${randomUUID().slice(0, 12)}`)
  const now = deps.now ?? (() => Date.now())

  return {
    async enqueue(input) {
      const parsed = parseLaneMissionInput({
        id: input.laneId,
        mission: input.mission,
      })
      if (!parsed) throw new Error('A valid lane and mission are required')
      if (missionContainsSensitiveValue(parsed.mission)) {
        throw new Error('Mission contains credential-shaped content')
      }
      return withQueueLock(deps.queuePath, async () => {
        const timestamp = now()
        const task: NexusTask = {
          id: idgen(),
          laneId: parsed.id,
          workerId: input.workerId,
          mission: parsed.mission,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        await appendTask(deps.queuePath, task)
        return publicTask(task)
      })
    },

    async list() {
      const tasks = await readTasks(deps.queuePath)
      return [...tasks.values()]
        .sort((left, right) => right.createdAt - left.createdAt)
        .map(publicTask)
    },

    async claimNext(workerId) {
      return withQueueLock(deps.queuePath, async () => {
        const tasks = await readTasks(deps.queuePath)
        const candidates = [...tasks.values()]
          .filter(
            (candidate) =>
              candidate.workerId === workerId && candidate.status === 'pending',
          )
          .sort((left, right) => left.createdAt - right.createdAt)
        if (candidates.length === 0) return null
        const task = candidates[0]
        const claimed: NexusTask = {
          ...task,
          status: 'running',
          updatedAt: now(),
        }
        await appendTask(deps.queuePath, claimed)
        return claimed
      })
    },

    async settle(id, input) {
      return withQueueLock(deps.queuePath, async () => {
        const task = (await readTasks(deps.queuePath)).get(id)
        if (!task) throw new Error(`Nexus task "${id}" not found`)
        if (task.status !== 'running') {
          throw new Error(`Nexus task "${id}" is not running`)
        }
        const settled: NexusTask = {
          ...task,
          ...input,
          updatedAt: now(),
        }
        await appendTask(deps.queuePath, settled)
        return publicTask(settled)
      })
    },

    async reconcileInterrupted() {
      return withQueueLock(deps.queuePath, async () => {
        const tasks = await readTasks(deps.queuePath)
        let reconciled = 0
        for (const task of tasks.values()) {
          if (task.status !== 'running') continue
          await appendTask(deps.queuePath, {
            ...task,
            status: 'blocked',
            updatedAt: now(),
            blockedReason:
              'Dispatcher restarted during execution; manual run reconciliation is required',
          })
          reconciled += 1
        }
        return reconciled
      })
    },
  }
}
