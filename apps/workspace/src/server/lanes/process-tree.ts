import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const POLL_MS = 25
const DEFAULT_GRACE_MS = 1_500
const DEFAULT_FORCE_ACK_MS = 3_000

/**
 * No current platform has a wired kernel-backed owner in Mission Control.
 * POSIX polling is retained only as test scaffolding; it is not containment.
 */
export function processTreeContainmentSupported(
  _platform: NodeJS.Platform = process.platform,
): boolean {
  return false
}

type ListDescendants = (rootPid: number) => Promise<Array<number>>

export interface ProcessTreeOptions {
  platform?: NodeJS.Platform
  force?: boolean
  graceMs?: number
  forceAckMs?: number
  signalGroup?: (pid: number, signal: NodeJS.Signals) => void
  groupExists?: (pid: number) => boolean
  signalProcess?: (pid: number, signal: NodeJS.Signals) => void
  processExists?: (pid: number) => boolean
  listDescendants?: ListDescendants
  ownedPids?: ReadonlySet<number>
  sleep?: (ms: number) => Promise<void>
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  process.kill(-pid, signal)
}

function groupExists(pid: number): boolean {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ESRCH') return false
    if (code === 'EPERM') return true
    throw error
  }
}

function signalProcess(pid: number, signal: NodeJS.Signals): void {
  process.kill(pid, signal)
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ESRCH') return false
    if (code === 'EPERM') return true
    throw error
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const execFileAsync = promisify(execFile)

/** Snapshot every current descendant, regardless of process-group/session changes. */
export async function listProcessDescendants(
  rootPid: number,
): Promise<Array<number>> {
  const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid='], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  })
  const children = new Map<number, Array<number>>()
  for (const line of stdout.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(\d+)$/)
    if (!match) continue
    const pid = Number(match[1])
    const parentPid = Number(match[2])
    const siblings = children.get(parentPid) ?? []
    siblings.push(pid)
    children.set(parentPid, siblings)
  }

  const descendants: Array<number> = []
  const queue = [...(children.get(rootPid) ?? [])]
  const seen = new Set<number>()
  while (queue.length > 0) {
    const pid = queue.shift()!
    if (seen.has(pid)) continue
    seen.add(pid)
    descendants.push(pid)
    queue.push(...(children.get(pid) ?? []))
  }
  return descendants
}

export interface ProcessTreeTracker {
  ownedPids: Set<number>
  stop: () => Promise<void>
}

/**
 * Track descendants while the root is alive so a child that later reparents or
 * starts a new session remains part of the owned termination set.
 */
export function createProcessTreeTracker(
  rootPid: number,
  listDescendants: ListDescendants = listProcessDescendants,
  pollMs = POLL_MS,
): ProcessTreeTracker {
  const ownedPids = new Set<number>()
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let failure: unknown
  let inFlight = Promise.resolve()
  let stopPromise: Promise<void> | undefined

  const sample = async () => {
    for (const pid of await listDescendants(rootPid)) ownedPids.add(pid)
  }
  const schedule = () => {
    if (stopped) return
    inFlight = sample()
      .catch((error) => {
        failure ??= error
      })
      .finally(() => {
        if (!stopped) timer = setTimeout(schedule, pollMs)
      })
  }
  schedule()

  return {
    ownedPids,
    stop() {
      stopPromise ??= (async () => {
        stopped = true
        if (timer) clearTimeout(timer)
        await inFlight
        try {
          await sample()
        } catch (error) {
          failure ??= error
        }
        if (failure) throw failure
      })()
      return stopPromise
    },
  }
}

export async function terminateProcessTree(
  pid: number,
  options: ProcessTreeOptions = {},
): Promise<void> {
  const platform = options.platform ?? process.platform
  if (platform === 'win32') {
    throw new Error(
      'Safe CLI process containment is unsupported on Windows without Job Object ownership',
    )
  }

  const graceMs = options.graceMs ?? DEFAULT_GRACE_MS
  const forceAckMs = options.forceAckMs ?? DEFAULT_FORCE_ACK_MS
  const wait = options.sleep ?? sleep
  const sendGroup = options.signalGroup ?? signalGroup
  const groupIsAlive = options.groupExists ?? groupExists
  const sendProcess = options.signalProcess ?? signalProcess
  const processIsAlive = options.processExists ?? processExists
  const listDescendants = options.listDescendants ?? listProcessDescendants
  const externallyTrackedPids = options.ownedPids
  const ownedPids = new Set(externallyTrackedPids ?? [])

  const safelySignal = (
    targetPid: number,
    signal: NodeJS.Signals,
    send: (pid: number, signal: NodeJS.Signals) => void,
  ) => {
    try {
      send(targetPid, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }

  const discover = async () => {
    for (const trackedPid of externallyTrackedPids ?? []) {
      if (trackedPid !== pid) ownedPids.add(trackedPid)
    }
    const discoveryRoots = [pid, ...ownedPids]
    for (const discoveryRoot of discoveryRoots) {
      for (const descendantPid of await listDescendants(discoveryRoot)) {
        if (descendantPid !== pid) ownedPids.add(descendantPid)
      }
    }
  }

  const signalPhase = async (
    signal: NodeJS.Signals,
    signalled: Set<number>,
  ) => {
    await discover()
    for (const ownedPid of ownedPids) {
      if (signalled.has(ownedPid)) continue
      safelySignal(ownedPid, signal, sendProcess)
      signalled.add(ownedPid)
    }
  }

  const waitForOwnedExit = async (
    timeoutMs: number,
    signal: NodeJS.Signals,
    signalled: Set<number>,
  ) => {
    const attempts = Math.max(1, Math.ceil(timeoutMs / POLL_MS) + 1)
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await signalPhase(signal, signalled)
      const groupAlive = groupIsAlive(pid)
      const descendantAlive = [...ownedPids].some((ownedPid) =>
        processIsAlive(ownedPid),
      )
      if (!groupAlive && !descendantAlive) return true
      if (attempt < attempts - 1) await wait(POLL_MS)
    }
    return false
  }

  if (!options.force) {
    const termSignalled = new Set<number>()
    await signalPhase('SIGTERM', termSignalled)
    safelySignal(pid, 'SIGTERM', sendGroup)
    if (await waitForOwnedExit(graceMs, 'SIGTERM', termSignalled)) return
  }

  const killSignalled = new Set<number>()
  await signalPhase('SIGKILL', killSignalled)
  safelySignal(pid, 'SIGKILL', sendGroup)
  if (await waitForOwnedExit(forceAckMs, 'SIGKILL', killSignalled)) return
  throw new Error(`Owned process tree ${pid} survived SIGKILL`)
}
