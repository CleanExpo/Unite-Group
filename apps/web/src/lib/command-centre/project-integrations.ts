import type { CommandCentreProject } from '@/lib/command-centre/registry'

export type ProjectConnectionState = 'connected' | 'ready' | 'mock' | 'blocked' | 'unknown'

export interface ProjectConnection {
  id: string
  label: string
  state: ProjectConnectionState
}

export interface ProjectIntegrationStatus {
  projectName: string
  statusUrl: string
  ok: boolean
  source: string | null
  generatedAt: string | null
  summary: Record<ProjectConnectionState, number> & { total: number }
  connections: ProjectConnection[]
  error: string | null
}

const EMPTY_SUMMARY: ProjectIntegrationStatus['summary'] = {
  total: 0,
  connected: 0,
  ready: 0,
  mock: 0,
  blocked: 0,
  unknown: 0,
}

const APPROVED_INTEGRATION_STATUS_HOSTS = new Set([
  'dimitri-itr-sandbox.vercel.app',
  'synthex.social',
  'restoreassist.app',
  'nrpg.business',
  'carsi.com.au',
  'ato-ai.app',
  'ato-blush.vercel.app',
  'ccw-crm-web.vercel.app',
  'disasterrecovery.com.au',
  'disaster-recovery-seven.vercel.app',
])

// Manifests that fail closed behind a bearer token (RestoreAssist's RA-6937
// route 401s anonymous callers). Env var NAMES only — values live on the
// Vercel plane. When the var is unset the fetch stays anonymous and the 401
// renders as an honest error, never a fabricated status.
const INTEGRATION_STATUS_TOKEN_ENV_BY_HOST: Record<string, string> = {
  'restoreassist.app': 'RESTOREASSIST_CONNECTIONS_STATUS_TOKEN',
}

function integrationStatusHeaders(host: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const envName = INTEGRATION_STATUS_TOKEN_ENV_BY_HOST[host]
  const token = envName ? process.env[envName] : undefined
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function emptyStatus(projectName: string, statusUrl: string, error: string): ProjectIntegrationStatus {
  return {
    projectName,
    statusUrl,
    ok: false,
    source: null,
    generatedAt: null,
    summary: { ...EMPTY_SUMMARY },
    connections: [],
    error,
  }
}

function isConnectionState(value: unknown): value is ProjectConnectionState {
  return value === 'connected' || value === 'ready' || value === 'mock' || value === 'blocked' || value === 'unknown'
}

function normaliseConnection(value: unknown): ProjectConnection | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.label !== 'string') return null
  if (row.safeForMissionControl !== true) return null
  const state = isConnectionState(row.state) ? row.state : 'unknown'
  return {
    id: row.id,
    label: row.label,
    state,
  }
}

function countConnections(connections: ProjectConnection[]): ProjectIntegrationStatus['summary'] {
  const summary = { ...EMPTY_SUMMARY, total: connections.length }
  for (const connection of connections) summary[connection.state] += 1
  return summary
}

async function fetchWithTimeout(url: URL, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal,
      headers: integrationStatusHeaders(url.hostname),
    })
  } finally {
    clearTimeout(timer)
  }
}

function getApprovedStatusUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:') return null
    if (!APPROVED_INTEGRATION_STATUS_HOSTS.has(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

export async function loadProjectIntegrationStatus(
  project: Pick<CommandCentreProject, 'name' | 'integration_status_url'>,
  timeoutMs = 2500,
): Promise<ProjectIntegrationStatus | null> {
  const statusUrl = project.integration_status_url?.trim()
  if (!statusUrl) return null

  const approvedUrl = getApprovedStatusUrl(statusUrl)
  if (!approvedUrl) return emptyStatus(project.name, statusUrl, 'status endpoint host is not approved')

  try {
    const response = await fetchWithTimeout(approvedUrl, timeoutMs)
    if (!response.ok) {
      return emptyStatus(project.name, statusUrl, `status endpoint returned ${response.status}`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const connections = Array.isArray(payload.connections)
      ? payload.connections.map(normaliseConnection).filter((c): c is ProjectConnection => c !== null)
      : []

    return {
      projectName: project.name,
      statusUrl,
      ok: true,
      source: typeof payload.source === 'string' ? payload.source : null,
      generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : null,
      summary: countConnections(connections),
      connections,
      error: null,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return emptyStatus(project.name, statusUrl, reason)
  }
}

export async function loadProjectIntegrationStatuses(
  projects: Pick<CommandCentreProject, 'name' | 'integration_status_url'>[],
  timeoutMs = 2500,
): Promise<ProjectIntegrationStatus[]> {
  const statuses = await Promise.all(projects.map((project) => loadProjectIntegrationStatus(project, timeoutMs)))
  return statuses.filter((status): status is ProjectIntegrationStatus => status !== null)
}
