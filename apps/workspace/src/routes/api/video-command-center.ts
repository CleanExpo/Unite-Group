import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'

const DEFAULT_VIDEO_COMMAND_CENTER_URL = 'http://127.0.0.1:3990'
const REQUEST_TIMEOUT_MS = 2500

type VideoCommandCenterProject = {
  slug: string
  name: string
  role?: string
  repo?: string
  status?: string
  packetCount?: number
  commandCentreUrl?: string
}

type VideoCommandCenterStatus = {
  ok: boolean
  status: 'connected' | 'disconnected'
  baseUrl: string
  checkedAt: number
  workspace?: {
    port?: number
    dryRunDefault?: boolean
    oneVoicePolicy?: string
  }
  canonicalControlPlane?: string
  projectCount: number
  connectedProjectCount: number
  packetCount: number
  projects: Array<VideoCommandCenterProject>
  jobsCount?: number
  error?: string
}

function redactUrlCredentials(value: string): string {
  return value.replace(/:\/\/[^\s/@]+@/g, '://[REDACTED]@')
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export const Route = createFileRoute('/api/video-command-center')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const rawBaseUrl =
          process.env.VIDEO_COMMAND_CENTER_URL ||
          DEFAULT_VIDEO_COMMAND_CENTER_URL
        const baseUrl = rawBaseUrl.replace(/\/$/, '')
        const responseBaseUrl = redactUrlCredentials(baseUrl)
        const checkedAt = Date.now()

        try {
          const projectsPayload = await fetchJson<{
            canonicalControlPlane?: string
            workspace?: VideoCommandCenterStatus['workspace']
            projects?: Array<VideoCommandCenterProject>
          }>(`${baseUrl}/api/projects`)

          let jobsCount: number | undefined
          try {
            const jobsPayload = await fetchJson<{ jobs?: Array<unknown> }>(
              `${baseUrl}/api/jobs`,
            )
            jobsCount = Array.isArray(jobsPayload.jobs)
              ? jobsPayload.jobs.length
              : undefined
          } catch {
            jobsCount = undefined
          }

          const projects = Array.isArray(projectsPayload.projects)
            ? projectsPayload.projects
            : []
          const connectedProjectCount = projects.filter(
            (project) => project.status === 'connected',
          ).length
          const packetCount = projects.reduce(
            (total, project) => total + (Number(project.packetCount) || 0),
            0,
          )

          return json({
            ok: true,
            status: 'connected',
            baseUrl: responseBaseUrl,
            checkedAt,
            workspace: projectsPayload.workspace,
            canonicalControlPlane: projectsPayload.canonicalControlPlane,
            projectCount: projects.length,
            connectedProjectCount,
            packetCount,
            projects,
            jobsCount,
          } satisfies VideoCommandCenterStatus)
        } catch (error) {
          return json(
            {
              ok: false,
              status: 'disconnected',
              baseUrl: responseBaseUrl,
              checkedAt,
              projectCount: 0,
              connectedProjectCount: 0,
              packetCount: 0,
              projects: [],
              error: redactUrlCredentials(
                error instanceof Error ? error.message : String(error),
              ),
            } satisfies VideoCommandCenterStatus,
            { status: 503 },
          )
        }
      },
    },
  },
})
