import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
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

export const BOUNDED_PROHIBITED_ACTIONS = [
  'production-write',
  'deploy',
  'merge',
  'push',
  'delete',
  'remote-dispatch',
] as const

export const BOUNDED_REQUIRED_EVIDENCE = [
  'lane-run',
  'lane-events',
  'changed-clean-commit',
] as const

export interface NexusTaskAuthority {
  mode: 'bounded-non-production'
  risk: 'low'
  approval: 'explicit-authenticated-operator'
  approvedAt: number
  prohibitedActions: Array<(typeof BOUNDED_PROHIBITED_ACTIONS)[number]>
  requiredEvidence: Array<(typeof BOUNDED_REQUIRED_EVIDENCE)[number]>
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
  authority: NexusTaskAuthority
  runId?: string
  blockedReason?: string
  evidence?: NexusTaskEvidence
}

export type PublicNexusTask = Omit<NexusTask, 'mission'>

export interface EnqueueTaskInput {
  laneId: string
  workerId: NexusWorkerId
  mission: string
  authority: NexusTaskAuthority
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
  processId?: number
  hostId?: string
  isProcessAlive?: (pid: number) => boolean
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
const LOCK_TIMEOUT_MS = 10_000
const LOCK_STALE_MS = 5_000
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

function exactStringArray(
  value: unknown,
  expected: ReadonlyArray<string>,
): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index])
  )
}

export function isBoundedTaskAuthority(
  value: unknown,
): value is NexusTaskAuthority {
  return (
    isRecord(value) &&
    value.mode === 'bounded-non-production' &&
    value.risk === 'low' &&
    value.approval === 'explicit-authenticated-operator' &&
    typeof value.approvedAt === 'number' &&
    Number.isFinite(value.approvedAt) &&
    exactStringArray(value.prohibitedActions, BOUNDED_PROHIBITED_ACTIONS) &&
    exactStringArray(value.requiredEvidence, BOUNDED_REQUIRED_EVIDENCE)
  )
}

export function createBoundedTaskAuthority(
  approvedAt: number = Date.now(),
): NexusTaskAuthority {
  return {
    mode: 'bounded-non-production',
    risk: 'low',
    approval: 'explicit-authenticated-operator',
    approvedAt,
    prohibitedActions: [...BOUNDED_PROHIBITED_ACTIONS],
    requiredEvidence: [...BOUNDED_REQUIRED_EVIDENCE],
  }
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
    !Number.isFinite(value.updatedAt) ||
    !isBoundedTaskAuthority(value.authority)
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

async function readQueueRaw(queuePath: string): Promise<string> {
  try {
    return await fs.readFile(queuePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

async function writeQueueAtomically(
  queuePath: string,
  content: string,
): Promise<void> {
  const queueDir = path.dirname(queuePath)
  await fs.mkdir(queueDir, { recursive: true, mode: 0o700 })
  await fs.chmod(queueDir, 0o700)
  const temporaryPath = path.join(
    queueDir,
    `.${path.basename(queuePath)}.${process.pid}.${randomUUID()}.tmp`,
  )
  const handle = await fs.open(temporaryPath, 'wx', 0o600)
  try {
    await handle.writeFile(content, 'utf8')
    await handle.sync()
    await handle.close()
    await fs.rename(temporaryPath, queuePath)
    await fs.chmod(queuePath, 0o600)
  } catch (error) {
    await handle.close().catch(() => {})
    await fs.unlink(temporaryPath).catch(() => {})
    throw error
  }
  const directory = await fs.open(queueDir, 'r')
  try {
    await directory.sync()
  } finally {
    await directory.close()
  }
}

async function recoverTornQueueTail(queuePath: string): Promise<void> {
  const raw = await readQueueRaw(queuePath)
  if (!raw || raw.endsWith('\n')) return
  const lastNewline = raw.lastIndexOf('\n')
  const prefix = lastNewline >= 0 ? raw.slice(0, lastNewline + 1) : ''
  const tail = raw.slice(lastNewline + 1)
  try {
    const record: unknown = JSON.parse(tail)
    if (!isTask(record)) throw new Error('invalid final record')
    await writeQueueAtomically(queuePath, `${raw}\n`)
  } catch {
    await writeQueueAtomically(queuePath, prefix)
  }
}

async function appendTask(queuePath: string, task: NexusTask): Promise<void> {
  const raw = await readQueueRaw(queuePath)
  if (raw && !raw.endsWith('\n')) {
    throw new Error('Nexus task queue tail was not recovered before append')
  }
  await writeQueueAtomically(queuePath, `${raw}${JSON.stringify(task)}\n`)
}

interface QueueLockMetadata {
  token: string
  pid: number
  hostId: string
  acquiredAt: number
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function recoverStaleQueueLock(
  lockPath: string,
  owner: Omit<QueueLockMetadata, 'token' | 'acquiredAt'>,
  isProcessAlive: (pid: number) => boolean,
): Promise<boolean> {
  let raw = ''
  let modifiedAt = 0
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(lockPath, 'utf8'),
      fs.stat(lockPath),
    ])
    raw = content
    modifiedAt = stat.mtimeMs
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true
    throw error
  }

  let lock: QueueLockMetadata | null = null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      isRecord(parsed) &&
      typeof parsed.token === 'string' &&
      typeof parsed.pid === 'number' &&
      Number.isInteger(parsed.pid) &&
      typeof parsed.hostId === 'string' &&
      typeof parsed.acquiredAt === 'number'
    ) {
      lock = parsed as unknown as QueueLockMetadata
    }
  } catch {
    // A process can die between creating the lock and writing its metadata.
  }

  const age = Date.now() - (lock?.acquiredAt ?? modifiedAt)
  const recoverable =
    age >= LOCK_STALE_MS &&
    (!lock || (lock.hostId === owner.hostId && !isProcessAlive(lock.pid)))
  if (!recoverable) return false
  await fs.unlink(lockPath).catch((error) => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  })
  return true
}

async function withQueueLock<T>(
  queuePath: string,
  owner: Omit<QueueLockMetadata, 'token' | 'acquiredAt'>,
  isProcessAlive: (pid: number) => boolean,
  operation: () => Promise<T>,
): Promise<T> {
  const lockPath = `${queuePath}.lock`
  await fs.mkdir(path.dirname(queuePath), { recursive: true, mode: 0o700 })
  const startedAt = Date.now()
  let handle: Awaited<ReturnType<typeof fs.open>> | null = null
  while (!handle) {
    try {
      handle = await fs.open(lockPath, 'wx', 0o600)
      await handle.writeFile(
        JSON.stringify({
          ...owner,
          token: randomUUID(),
          acquiredAt: Date.now(),
        } satisfies QueueLockMetadata),
        'utf8',
      )
      await handle.sync()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (await recoverStaleQueueLock(lockPath, owner, isProcessAlive)) {
        continue
      }
      if (Date.now() - startedAt >= LOCK_TIMEOUT_MS) {
        throw new Error('Nexus task queue lock timed out')
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
  try {
    await recoverTornQueueTail(queuePath)
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
  const owner = {
    pid: deps.processId ?? process.pid,
    hostId: deps.hostId ?? os.hostname(),
  }
  const isProcessAlive = deps.isProcessAlive ?? processIsAlive

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
      if (!isBoundedTaskAuthority(input.authority)) {
        throw new Error('A valid bounded task authority is required')
      }
      return withQueueLock(deps.queuePath, owner, isProcessAlive, async () => {
        const timestamp = now()
        const task: NexusTask = {
          id: idgen(),
          laneId: parsed.id,
          workerId: input.workerId,
          mission: parsed.mission,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
          authority: input.authority,
        }
        await appendTask(deps.queuePath, task)
        return publicTask(task)
      })
    },

    async list() {
      return withQueueLock(deps.queuePath, owner, isProcessAlive, async () => {
        const tasks = await readTasks(deps.queuePath)
        return [...tasks.values()]
          .sort((left, right) => right.createdAt - left.createdAt)
          .map(publicTask)
      })
    },

    async claimNext(workerId) {
      return withQueueLock(deps.queuePath, owner, isProcessAlive, async () => {
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
      return withQueueLock(deps.queuePath, owner, isProcessAlive, async () => {
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
      return withQueueLock(deps.queuePath, owner, isProcessAlive, async () => {
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
