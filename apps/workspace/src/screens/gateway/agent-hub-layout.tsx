import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { OfficeView, type RemoteSession } from './components/office-view'
import type { CSSProperties } from 'react'
import type {
  AgentWorkingRow,
  AgentWorkingStatus,
} from './components/agents-working-panel'
import type { AgentHubLayoutProps } from './components/hub-constants'
import {
  fetchHarnessSnapshot,
  type HarnessSession,
  type HarnessSessionState,
} from '@/lib/harness-api'

export { AgentAvatar } from './components/agent-avatar'

const THEME_STYLE: CSSProperties = {
  ['--theme-bg' as string]: 'var(--color-surface)',
  ['--theme-card' as string]: 'var(--color-primary-50)',
  ['--theme-border' as string]: 'var(--color-primary-200)',
  ['--theme-text' as string]: 'var(--color-ink)',
  ['--theme-muted' as string]: 'var(--color-primary-700)',
  ['--theme-muted-2' as string]: 'var(--color-primary-600)',
  ['--theme-accent' as string]: 'var(--color-accent-500)',
  ['--theme-accent-strong' as string]: 'var(--color-accent-600)',
}

function mapState(state: HarnessSessionState): AgentWorkingStatus {
  switch (state) {
    case 'active':
      return 'active'
    case 'paused':
      return 'paused'
    case 'error':
      return 'error'
    case 'waiting':
      return 'waiting_for_input'
    case 'idle':
    case 'complete':
      return 'idle'
    default:
      return 'none'
  }
}

function sessionMatchesAgent(session: HarnessSession, agentName: string): boolean {
  const label = session.label.trim().toLowerCase()
  const name = agentName.trim().toLowerCase()
  if (!name) return false
  if (label === name || label.startsWith(`${name} `)) return true
  return label
    .split(':')
    .map((segment) => segment.trim())
    .some((segment) => segment === name)
}

function deriveAgentRows(
  agents: AgentHubLayoutProps['agents'],
  sessions: Array<HarnessSession>,
): Array<AgentWorkingRow> {
  if (agents.length > 0) {
    return agents.map((agent) => {
      const session = sessions.find((candidate) =>
        sessionMatchesAgent(candidate, agent.name),
      )

      return {
        id: agent.id,
        name: agent.name,
        modelId: session?.model || 'unknown',
        status: session ? mapState(session.state) : 'none',
        lastLine: session?.task || 'No live session',
        lastAt: session?.updatedAt || undefined,
        taskCount: session ? 1 : 0,
        currentTask: session?.task,
        roleDescription: agent.role,
        sessionKey: session?.id,
      }
    })
  }

  // No configured roster: render only actual runtime sessions. Never invent
  // workers to make Mission Control look busy.
  return [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12)
    .map((session) => ({
      id: session.id,
      name: session.label,
      modelId: session.model,
      status: mapState(session.state),
      lastLine: session.task,
      lastAt: session.updatedAt || undefined,
      taskCount: 1,
      currentTask: session.task,
      roleDescription: `${session.provider} runtime`,
      sessionKey: session.id,
    }))
}

function deriveRemoteSessions(sessions: Array<HarnessSession>): Array<RemoteSession> {
  return sessions.map((session) => ({
    sessionKey: session.id,
    label: session.label,
    model: session.model,
    status:
      session.state === 'active'
        ? 'active'
        : session.state === 'complete'
          ? 'done'
          : 'idle',
    startedAt: session.startedAt || session.updatedAt || Date.now(),
    kind: session.provider,
    lastMessage: session.task,
    tokenCount: session.tokenCount,
  }))
}

export function AgentHubLayout({ agents }: AgentHubLayoutProps) {
  const navigate = useNavigate()
  const harnessQuery = useQuery({
    queryKey: ['mission-control', 'harness-snapshot'],
    queryFn: fetchHarnessSnapshot,
    refetchInterval: 5_000,
    retry: 1,
  })

  const sessions = harnessQuery.data?.sessions ?? []
  const agentRows = useMemo(
    () => deriveAgentRows(agents, sessions),
    [agents, sessions],
  )
  const remoteSessions = useMemo(
    () => deriveRemoteSessions(sessions),
    [sessions],
  )
  const hasActive = sessions.some((session) => session.state === 'active')

  return (
    <div
      className="flex min-h-dvh flex-col bg-[var(--theme-bg)] text-[var(--theme-text)]"
      style={THEME_STYLE}
    >
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-stretch justify-center gap-4 px-4 pb-24 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-xs">
          <div>
            <span className="font-semibold text-[var(--theme-text)]">
              Unite-Group
            </span>
            <span className="ml-2 text-[var(--theme-muted)]">
              Harness: {harnessQuery.data?.provider ?? 'unavailable'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[var(--theme-muted)]">
            <span>{sessions.length} real session{sessions.length === 1 ? '' : 's'}</span>
            <span>{hasActive ? 'Live work observed' : 'No active work observed'}</span>
            {harnessQuery.isError ? (
              <span className="font-medium text-red-600">Harness disconnected</span>
            ) : null}
          </div>
        </div>

        <section
          className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-sm"
          style={{ height: 560 }}
        >
          <OfficeView
            agentRows={agentRows}
            missionRunning={hasActive}
            onViewOutput={() => void navigate({ to: '/conductor' })}
            onNewMission={() => void navigate({ to: '/conductor' })}
            processType="parallel"
            companyName="Unite-Group"
            remoteSessions={remoteSessions}
            onViewRemoteOutput={() => void navigate({ to: '/conductor' })}
            containerHeight={560}
          />
        </section>
      </main>
    </div>
  )
}
