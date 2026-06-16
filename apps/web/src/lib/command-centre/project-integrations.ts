import type { CommandCentreProject } from '@/lib/command-centre/registry'

export type ProjectConnectionState = 'connected' | 'ready' | 'mock' | 'blocked' | 'unknown'

export interface ProjectConnection {
  id: string
  label: string
  state: ProjectConnectionState
  safeForMissionControl: boolean
  detail: string
  endpoint?: string
  nextAction?: string
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
  const state = isConnectionState(row.state) ? row.state : 'unknown'
  return {
    id: row.id,
    label: row.label,
    state,
    safeForMissionControl: row.safeForMissionControl === true,
    detail: typeof row.detail === 'string' ? row.detail : '',
    endpoint: typeof row.endpoint === 'string' ? row.endpoint : undefined,
    nextAction: typeof row.nextAction === 'string' ? row.nextAction : undefined,
  }
}

function countConnections(connections: ProjectConnection[]): ProjectIntegrationStatus['summary'] {
  const summary = { ...EMPTY_SUMMARY, total: connections.length }
  for (const connection of connections) summary[connection.state] += 1
  return summary
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function loadProjectIntegrationStatus(
  project: Pick<CommandCentreProject, 'name' | 'integration_status_url'>,
  timeoutMs = 2500,
): Promise<ProjectIntegrationStatus | null> {
  const statusUrl = project.integration_status_url?.trim()
  if (!statusUrl) return null

  try {
    const response = await fetchWithTimeout(statusUrl, timeoutMs)
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
