import { statfs } from 'node:fs/promises'
import { hostname } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type LocalHostSignalState = 'ready' | 'degraded' | 'unknown'

export interface LocalHostSignal {
  id: 'hermes' | 'ollama' | 'storage' | 'mesh_heartbeat'
  label: string
  state: LocalHostSignalState
  detail: string
}

export interface LocalHostStatus {
  configured: boolean
  observedAt: string
  host: string | null
  signals: LocalHostSignal[]
}

export interface LocalHostStatusDependencies {
  fetch: typeof fetch
  statfs: typeof statfs
  hostname: typeof hostname
  execFile: typeof execFileAsync
  env: NodeJS.ProcessEnv
}

const localAdapterEnabled = (env: NodeJS.ProcessEnv) => env.MISSION_CONTROL_LOCAL_HOST_ADAPTER === '1'

async function probeHttp(
  fetchImpl: typeof fetch,
  url: string,
): Promise<boolean> {
  try {
    const response = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(2500) })
    return response.ok
  } catch {
    return false
  }
}

async function probeMeshHeartbeat(execFileImpl: typeof execFileAsync): Promise<boolean> {
  try {
    const { stdout } = await execFileImpl('launchctl', [
      'print',
      `gui/${process.getuid?.() ?? 0}/com.unite-group.mesh-heartbeat`,
    ], { timeout: 2500, maxBuffer: 16 * 1024 })
    return /state = running/.test(stdout)
  } catch {
    return false
  }
}

function disabledStatus(): LocalHostStatus {
  return {
    configured: false,
    observedAt: new Date().toISOString(),
    host: null,
    signals: [
      { id: 'hermes', label: 'Hermes', state: 'unknown', detail: 'local adapter not enabled' },
      { id: 'ollama', label: 'Ollama / Gemma', state: 'unknown', detail: 'local adapter not enabled' },
      { id: 'storage', label: 'External storage', state: 'unknown', detail: 'local adapter not enabled' },
      { id: 'mesh_heartbeat', label: 'Mesh heartbeat', state: 'unknown', detail: 'local adapter not enabled' },
    ],
  }
}

export async function readLocalHostStatus(
  deps: LocalHostStatusDependencies = {
    fetch,
    statfs,
    hostname,
    execFile: execFileAsync,
    env: process.env,
  },
): Promise<LocalHostStatus> {
  if (!localAdapterEnabled(deps.env)) return disabledStatus()

  const storagePath = deps.env.MISSION_CONTROL_STORAGE_PATH?.trim()
  const [hermesReady, ollamaReady, meshHeartbeat, storage] = await Promise.all([
    probeHttp(deps.fetch, 'http://127.0.0.1:8642/health'),
    probeHttp(deps.fetch, 'http://127.0.0.1:11434/api/tags'),
    probeMeshHeartbeat(deps.execFile),
    storagePath
      ? deps.statfs(storagePath).then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const }))
      : Promise.resolve({ ok: false as const }),
  ])

  const storageDetail = !storagePath
    ? 'storage path not configured'
    : !storage.ok
      ? 'storage path unavailable'
      : `${Math.floor((storage.value.bavail * storage.value.bsize) / 1024 / 1024 / 1024)} GB free`

  return {
    configured: true,
    observedAt: new Date().toISOString(),
    host: deps.hostname(),
    signals: [
      { id: 'hermes', label: 'Hermes', state: hermesReady ? 'ready' : 'degraded', detail: hermesReady ? 'health endpoint responded' : 'health endpoint unavailable' },
      { id: 'ollama', label: 'Ollama / Gemma', state: ollamaReady ? 'ready' : 'degraded', detail: ollamaReady ? 'local model service responded' : 'local model service unavailable' },
      { id: 'storage', label: 'External storage', state: storage.ok ? 'ready' : 'degraded', detail: storageDetail },
      { id: 'mesh_heartbeat', label: 'Mesh heartbeat', state: meshHeartbeat ? 'ready' : 'degraded', detail: meshHeartbeat ? 'launch agent running' : 'launch agent unavailable' },
    ],
  }
}
