// src/app/(founder)/founder/agents/page.tsx
//
// Founder agents cockpit — per-agent presence cards + 7-day activity heatmap.
// Real data only (No-Invaders): operator_agent_presence heartbeats,
// operator_jobs outcomes, operator_events + cc_task_events timestamps.
// Founder-only via the (founder) layout; every query founder-scoped (RLS).
//
// Honesty note: operator_jobs / operator_events carry NO agent_id column, so
// run outcomes and the activity stream are founder-scope facts, not per-agent
// attributions — the page labels them accordingly.

export const dynamic = 'force-dynamic'

import { Fragment } from 'react'
import { getUser, createClient } from '@/lib/supabase/server'
import {
  getGatewayConnection,
  type AgentPresenceReadClient,
  type GatewayConnection,
} from '@/lib/operator-gateway/presence'
import {
  getOperatorJobsView,
  getOperatorJobEvents,
  type OperatorJobsReadClient,
  type OperatorEventsReadClient,
} from '@/lib/operator-gateway/jobs'
import {
  ACTIVITY_TIMEZONE,
  ACTIVITY_WINDOW_DAYS,
  WEEKDAY_LABELS,
  bucketWeekdayHour,
  fetchActivityTimestamps,
  relativeTime,
  summariseJobOutcomes,
  type ActivityHeatmap,
  type ActivityTimestampReadClient,
} from '@/lib/operator-gateway/agent-activity'
import {
  Card,
  MetricCard,
  Pill,
  SectionHeader,
  connectionTone,
  grid,
  theme,
  type Tone,
} from '../command-centre/operator-gateway/_components'

const wrap: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '2rem 1.25rem 3rem',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  color: theme.text,
}

const stateDotColour: Record<GatewayConnection['state'], string> = {
  connected: theme.ok,
  stale: theme.warn,
  offline: theme.bad,
}

function StateDot({ state }: { state: GatewayConnection['state'] }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: 999,
        background: stateDotColour[state],
        boxShadow: state === 'connected' ? `0 0 6px ${theme.ok}` : 'none',
        marginRight: 8,
        verticalAlign: 'baseline',
      }}
    />
  )
}

function Heatmap({ heatmap }: { heatmap: ActivityHeatmap }) {
  const cell = 16
  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `44px repeat(24, ${cell}px)`,
          gap: 3,
          width: 'max-content',
        }}
      >
        {/* Hour header row */}
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span
            key={`h-${hour}`}
            style={{
              fontSize: 9,
              color: theme.muted,
              textAlign: 'center',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {hour % 6 === 0 ? String(hour).padStart(2, '0') : ''}
          </span>
        ))}
        {WEEKDAY_LABELS.map((label, day) => (
          <Fragment key={label}>
            <span
              style={{
                fontSize: 11,
                color: theme.muted,
                lineHeight: `${cell}px`,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {label}
            </span>
            {heatmap.grid[day].map((count, hour) => {
              const alpha = count === 0 || heatmap.max === 0 ? 0.05 : 0.2 + 0.8 * (count / heatmap.max)
              return (
                <span
                  key={`c-${label}-${hour}`}
                  title={`${label} ${String(hour).padStart(2, '0')}:00 — ${count} event${count === 1 ? '' : 's'}`}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: 2,
                    background: `rgba(63, 185, 80, ${alpha})`,
                    border: `1px solid ${count === 0 ? theme.borderSoft : 'rgba(63, 185, 80, 0.35)'}`,
                  }}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export default async function FounderAgentsPage() {
  const user = await getUser()
  // One founder-scoped (RLS) prod client serves presence, jobs, events, and activity.
  const supabase = user ? await createClient() : null
  const now = Date.now()

  const connection =
    user && supabase
      ? await getGatewayConnection(supabase as unknown as AgentPresenceReadClient, user.id, now)
      : null
  const jobsView =
    user && supabase
      ? await getOperatorJobsView({
          founderId: user.id,
          client: supabase as unknown as OperatorJobsReadClient,
          source: 'production',
        })
      : null
  const jobEvents =
    user && supabase
      ? await getOperatorJobEvents(supabase as unknown as OperatorEventsReadClient, user.id, 1)
      : []
  const activity =
    user && supabase
      ? await fetchActivityTimestamps(supabase as unknown as ActivityTimestampReadClient, user.id, now)
      : { timestamps: [], sourceCounts: { operator_events: 0, cc_task_events: 0 } }

  const heatmap = bucketWeekdayHour(activity.timestamps, ACTIVITY_TIMEZONE)
  const outcomes = summariseJobOutcomes(jobsView?.jobs ?? [])
  const latestEvent = jobEvents[0] ?? null
  const latestJob = jobsView?.jobs[0] ?? null

  const agents = connection?.agents ?? []
  const connectedCount = agents.filter((a) => a.state === 'connected').length

  const agentsTone: Tone = connectedCount > 0 ? 'ok' : agents.length > 0 ? 'warn' : 'muted'
  const runsTone: Tone =
    outcomes.successRatio === null ? 'muted' : outcomes.successRatio >= 0.5 ? 'ok' : 'bad'
  const successValue =
    outcomes.successRatio === null
      ? 'no runs yet'
      : `${outcomes.done}/${outcomes.done + outcomes.failed} (${Math.round(outcomes.successRatio * 100)}%)`

  // Latest activity line — founder-scope (schema has no per-agent attribution).
  const latestActivityLine = latestEvent
    ? `${latestEvent.eventType}${latestEvent.toStatus ? ` → ${latestEvent.toStatus}` : ''} · ${relativeTime(latestEvent.at, now)}`
    : latestJob
      ? `job '${latestJob.title}' ${latestJob.status} · ${relativeTime(latestJob.updatedAt, now)}`
      : 'no activity recorded'

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: 28, marginBottom: '0.25rem' }}>Agents</h1>
      <p style={{ color: theme.muted, marginTop: 0 }}>
        Live agent presence from <code>operator_agent_presence</code> heartbeats · run outcomes from{' '}
        <code>operator_jobs</code> · activity from <code>operator_events</code> +{' '}
        <code>cc_task_events</code>. Founder-scoped, real data only.
      </p>

      {/* Top status strip */}
      <section aria-label="agents summary" style={{ ...grid, marginBottom: '1.25rem' }}>
        <MetricCard
          label="Agents"
          value={agents.length > 0 ? `${connectedCount}/${agents.length} online` : 'none'}
          tone={agentsTone}
          hint={
            connection
              ? connection.source === 'live_presence'
                ? `freshest heartbeat ${connection.freshestAgeSeconds}s ago`
                : connection.source === 'no_agents'
                  ? 'no agent has ever checked in'
                  : 'presence table not provisioned'
              : 'not signed in'
          }
        />
        <MetricCard
          label="Run success"
          value={successValue}
          tone={runsTone}
          hint={`${outcomes.total} jobs · ${outcomes.inFlight} in flight · ${outcomes.cancelled} cancelled · founder-scope`}
        />
        <MetricCard
          label={`Events · ${ACTIVITY_WINDOW_DAYS}d`}
          value={heatmap.total}
          tone={heatmap.total > 0 ? 'ok' : 'muted'}
          hint={`${activity.sourceCounts.operator_events} operator · ${activity.sourceCounts.cc_task_events} task events`}
        />
      </section>

      {/* Agent cards */}
      <SectionHeader title="Agent presence" />
      {agents.length > 0 ? (
        <section aria-label="agent cards" style={{ ...grid, marginBottom: '1.5rem' }}>
          {agents.map((agent) => (
            <Card key={agent.agentId} style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <h3 style={{ fontSize: 16, margin: 0 }}>
                  <StateDot state={agent.state} />
                  {agent.agentId}
                </h3>
                <Pill tone={connectionTone(agent.state)}>{agent.state}</Pill>
              </div>
              <p style={{ color: theme.muted, fontSize: 13, margin: '0.5rem 0 0.25rem' }}>
                {agent.hostname ?? 'unknown host'} · {agent.agentVersion ?? 'unknown version'}
              </p>
              <p style={{ fontSize: 13, margin: '0.25rem 0' }}>
                Last heartbeat: <b>{relativeTime(agent.lastSeenAt, now)}</b>
              </p>
              <p style={{ fontSize: 13, margin: '0.25rem 0' }}>
                Up since: <b>{relativeTime(agent.startedAt, now).replace(' ago', '')}</b>
              </p>
              <p style={{ color: theme.muted, fontSize: 12, margin: '0.5rem 0 0' }}>
                Latest founder activity: {latestActivityLine}
              </p>
            </Card>
          ))}
        </section>
      ) : (
        <Card>
          <p style={{ color: theme.muted, fontSize: 14, margin: 0 }}>
            {connection?.source === 'not_provisioned'
              ? `No agent presence available — ${connection.reason ?? 'presence table missing or unreachable'}.`
              : 'No agent has ever checked in. Start the local Hermes runner to register a heartbeat.'}
          </p>
        </Card>
      )}

      {/* Runs summary — founder scope, honestly labelled */}
      <Card aria-label="operator runs">
        <SectionHeader
          title="Operator runs"
          trailing={
            <Pill tone={runsTone}>
              {outcomes.successRatio === null ? 'no runs yet' : successValue}
            </Pill>
          }
        />
        {outcomes.total > 0 ? (
          <div style={grid}>
            <p style={{ fontSize: 14, margin: '0.25rem 0' }}>
              Done: <b style={{ color: theme.ok }}>{outcomes.done}</b>
            </p>
            <p style={{ fontSize: 14, margin: '0.25rem 0' }}>
              Failed: <b style={{ color: outcomes.failed > 0 ? theme.bad : theme.text }}>{outcomes.failed}</b>
            </p>
            <p style={{ fontSize: 14, margin: '0.25rem 0' }}>
              Cancelled: <b>{outcomes.cancelled}</b>
            </p>
            <p style={{ fontSize: 14, margin: '0.25rem 0' }}>
              In flight: <b>{outcomes.inFlight}</b>
            </p>
          </div>
        ) : (
          <p style={{ color: theme.muted, fontSize: 14, margin: 0 }}>
            No operator jobs recorded yet.
          </p>
        )}
        <p style={{ color: theme.muted, fontSize: 12, margin: '0.75rem 0 0' }}>
          operator_jobs carries no per-agent attribution — outcomes are founder-scope facts across
          all agents.
        </p>
      </Card>

      {/* 7-day activity heatmap */}
      <Card aria-label="activity heatmap">
        <SectionHeader
          title={`ACTIVITY — LAST ${ACTIVITY_WINDOW_DAYS} DAYS`}
          trailing={
            <span style={{ fontSize: 12, color: theme.muted }}>
              {heatmap.total} event{heatmap.total === 1 ? '' : 's'} · weekday × hour ·{' '}
              {ACTIVITY_TIMEZONE}
            </span>
          }
        />
        <Heatmap heatmap={heatmap} />
        {heatmap.total === 0 ? (
          <p style={{ color: theme.muted, fontSize: 13, margin: '0.75rem 0 0' }}>
            No agent events recorded in the last {ACTIVITY_WINDOW_DAYS} days.
          </p>
        ) : (
          <p style={{ color: theme.muted, fontSize: 12, margin: '0.75rem 0 0' }}>
            Cell intensity = event count from operator_events ({activity.sourceCounts.operator_events})
            and cc_task_events ({activity.sourceCounts.cc_task_events}), bucketed in{' '}
            {ACTIVITY_TIMEZONE}.
          </p>
        )}
      </Card>
    </div>
  )
}
