import { spawn } from 'node:child_process'

const POLL_MS = 25
const DEFAULT_GRACE_MS = 1_500
const DEFAULT_FORCE_ACK_MS = 3_000

type Taskkill = (pid: number, force: boolean) => Promise<void>

export interface ProcessTreeOptions {
  platform?: NodeJS.Platform
  force?: boolean
  graceMs?: number
  forceAckMs?: number
  signalGroup?: (pid: number, signal: NodeJS.Signals) => void
  groupExists?: (pid: number) => boolean
  taskkill?: Taskkill
  sleep?: (ms: number) => Promise<void>
}

export function windowsTaskkillArgs(pid: number, force: boolean): Array<string> {
  return ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])]
}

function runTaskkill(pid: number, force: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('taskkill', windowsTaskkillArgs(pid, force), {
      stdio: 'ignore',
      windowsHide: true,
    })
    let settled = false
    child.once('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
    child.once('close', (code) => {
      if (settled) return
      settled = true
      if (code === 0 || code === 128) resolve()
      else reject(new Error(`taskkill exited with code ${code ?? 'unknown'}`))
    })
  })
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

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

async function waitForGroupExit(
  pid: number,
  timeoutMs: number,
  exists: (pid: number) => boolean,
  wait: (ms: number) => Promise<void>,
): Promise<boolean> {
  const attempts = Math.max(1, Math.ceil(timeoutMs / POLL_MS) + 1)
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!exists(pid)) return true
    if (attempt < attempts - 1) await wait(POLL_MS)
  }
  return false
}

export async function terminateProcessTree(
  pid: number,
  options: ProcessTreeOptions = {},
): Promise<void> {
  const platform = options.platform ?? process.platform
  const graceMs = options.graceMs ?? DEFAULT_GRACE_MS
  const forceAckMs = options.forceAckMs ?? DEFAULT_FORCE_ACK_MS
  const wait = options.sleep ?? sleep

  if (platform === 'win32') {
    const taskkill = options.taskkill ?? runTaskkill
    if (options.force) {
      await taskkill(pid, true)
      return
    }
    try {
      await taskkill(pid, false)
    } catch {
      await wait(graceMs)
      await taskkill(pid, true)
    }
    return
  }

  const send = options.signalGroup ?? signalGroup
  const exists = options.groupExists ?? groupExists
  const sendSignal = (signal: NodeJS.Signals) => {
    try {
      send(pid, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }

  if (!options.force) {
    sendSignal('SIGTERM')
    if (await waitForGroupExit(pid, graceMs, exists, wait)) return
  }

  sendSignal('SIGKILL')
  if (await waitForGroupExit(pid, forceAckMs, exists, wait)) return
  throw new Error(`Process group ${pid} survived SIGKILL`)
}
