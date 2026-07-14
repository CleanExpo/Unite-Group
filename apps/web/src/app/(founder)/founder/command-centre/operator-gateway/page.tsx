// src/app/(founder)/founder/command-centre/operator-gateway/page.tsx
//
// Unite-Group Nexus Command Centre — operator execution surface (SANDBOX DRY-RUN + CONTROLLED REAL-LOCAL FOUNDATION MODE).
// Founder-only via the (founder) layout. This page may create sandbox planned jobs and dry-run them only:
// no production DB writes, no external execution, no live runner, no API keys, no web-session scraping. No real execute button.

export const dynamic = 'force-dynamic'

import { Chakra_Petch } from 'next/font/google'
import { getUser, createClient } from '@/lib/supabase/server'
import { getCommandCentreOperatorSurfaceView } from '@/lib/operator-gateway/command-centre'
import {
  getOperatorJobsView,
  getOperatorJobEvents,
  type OperatorJobsReadClient,
  type OperatorEventsReadClient,
} from '@/lib/operator-gateway/jobs'
import {
  getGatewayConnection,
  type AgentPresenceReadClient,
} from '@/lib/operator-gateway/presence'
import {
  Card,
  CollapsibleGroup,
  MetricCard,
  Pill,
  SectionHeader,
  StatusRow,
  connectionTone,
  runtimeTone,
  grid,
  th,
  td,
  inputStyle,
  theme,
  type Tone,
} from './_components'
import { DeckDetails, DeckMoreLine, DECK_LIST_CAP } from '@/components/command-centre/DeckDetails'
import deckStyles from '../command-deck.module.css'

// Deck typeface — same face + variable the command-centre deck loads, so the
// command-deck.module.css `--font-chakra` stack resolves on this sub-route too.
const chakra = Chakra_Petch({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-chakra',
  display: 'swap',
})

const wrap: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
}
// Banner fills are alpha washes of the deck LED accents (--deck-go / --deck-amber).
const banner: React.CSSProperties = {
  background: 'rgba(45, 187, 87, 0.08)',
  border: '1px solid rgba(45, 187, 87, 0.35)',
  borderRadius: 2,
  padding: '0.85rem 1rem',
  marginBottom: '1rem',
  fontSize: 14,
}
const warning: React.CSSProperties = {
  background: 'rgba(244, 130, 15, 0.08)',
  border: '1px solid rgba(244, 130, 15, 0.4)',
  borderRadius: 2,
  padding: '0.85rem 1rem',
  marginBottom: '1.25rem',
  fontSize: 14,
}

export default async function OperatorGatewayPage() {
  const user = await getUser()
  // One founder-scoped (RLS) prod client serves jobs, events, and presence.
  const supabase = user ? await createClient() : null
  const jobsView =
    user && supabase
      ? await getOperatorJobsView({
          founderId: user.id,
          client: supabase as unknown as OperatorJobsReadClient,
          source: 'production',
        })
      : undefined
  const jobEvents =
    user && supabase ? await getOperatorJobEvents(supabase as unknown as OperatorEventsReadClient, user.id) : []
  const view = getCommandCentreOperatorSurfaceView({ jobsView, sandboxJobCreationEnabled: true })
  const activeLanes = view.lanes.filter((lane) => lane.status === 'active')
  const inactiveLanes = view.lanes.filter((lane) => lane.status !== 'active')
  // Live agent connection — derived from operator_agent_presence heartbeats (founder-scoped).
  const agentConnection =
    user && supabase ? await getGatewayConnection(supabase as unknown as AgentPresenceReadClient, user.id) : null

  // ---- Safety consolidation -------------------------------------------------
  // The page exposes many boolean gate flags. We surface a single "all gates green"
  // summary up top and inside the Safety group, while keeping every individual flag.
  // Each entry: a flag is "green" when `safe` is true.
  const safetyFlags: { label: string; value: boolean; safeWhenFalse: boolean }[] = [
    { label: 'No API-key mode', value: view.noApiKeyMode, safeWhenFalse: false },
    { label: 'External execution enabled', value: view.externalExecutionEnabled, safeWhenFalse: true },
    { label: 'Production DB touched', value: view.safetyStatus.productionDbTouched, safeWhenFalse: true },
    { label: 'Deployment occurred', value: view.safetyStatus.deploymentOccurred, safeWhenFalse: true },
    { label: 'Web session scraping', value: view.safetyStatus.webSessionScraping, safeWhenFalse: true },
  ]
  const safetyIssueCount = safetyFlags.filter((f) => (f.safeWhenFalse ? f.value : !f.value)).length
  const safetyAllGreen = safetyIssueCount === 0
  const blockedGateCount = view.blockedGates.filter((g) => g.status === 'blocked').length

  // ---- Metric strip derivations --------------------------------------------
  const agentTone: Tone = agentConnection ? connectionTone(agentConnection.state) : 'muted'
  const agentValue = agentConnection ? agentConnection.state : 'no agent'
  const agentHint = agentConnection
    ? `last heartbeat ${agentConnection.freshestAgeSeconds}s ago`
    : 'bridge not provisioned'

  const safetyTone: Tone = safetyAllGreen ? 'ok' : 'bad'
  const safetyValue = safetyAllGreen ? 'all green' : `${safetyIssueCount} issue${safetyIssueCount === 1 ? '' : 's'}`
  const safetyHint = `${safetyFlags.length} safety flags · ${blockedGateCount} hard gates blocked`

  const lanesTone: Tone = activeLanes.length > 0 ? 'ok' : 'warn'
  const lanesHint = `${inactiveLanes.length} inactive/blocked · all apiKeyRequired=false`

  const jobsTone: Tone = view.jobQueue.connected ? 'ok' : 'warn'
  const jobsValue = view.jobQueue.jobCount
  const jobsHint = `source: ${view.jobQueue.source} · dry-run only`

  return (
    <div className={`${chakra.variable} ${deckStyles.deck}`}>
    <div style={wrap}>
      <h1 style={{ fontSize: 28, marginBottom: '0.25rem' }}>Nexus Command Centre · Operator Execution Surface</h1>
      <p style={{ color: theme.muted, marginTop: 0 }}>
        Founder-controlled inventory for Hermes, the attested Codex/ChatGPT plan lane, pending Claude Code plan lanes, Cursor CLI, and registered Nexus skills.
      </p>

      {/* Top status strip — at-a-glance summary of agent, safety, lanes, jobs. */}
      <section aria-label="status summary" style={{ ...grid, marginBottom: '1.25rem' }}>
        <MetricCard label="Agent" value={agentValue} tone={agentTone} hint={agentHint} />
        <MetricCard label="Safety" value={safetyValue} tone={safetyTone} hint={safetyHint} />
        <MetricCard label="Lanes" value={`${activeLanes.length} active`} tone={lanesTone} hint={lanesHint} />
        <MetricCard label="Jobs" value={jobsValue} tone={jobsTone} hint={jobsHint} />
      </section>

      <div style={banner}>
        <strong>Operator-session lanes only.</strong> No API keys. Max/Pro plans are not backend credentials. No external execution yet.
        The CRM may show lanes, plan jobs, display evidence, and expose blocked gates — it does not run Codex/Claude/MiniMax/Cursor/Hermes jobs from this page. Controlled real-local execution is policy-gated; dispatch is still disabled.
      </div>

      <div style={warning}>
        <strong>Production actions gated.</strong> Deployment, production DB writes, sandbox migration apply, web-session scraping,
        stored subscription credentials, browser automation, payments, email, claims, and orders remain blocked unless Phill grants a later named gate.
      </div>

      {/* HERO — Hermes agent connection, always open, directly under the strip. */}
      {agentConnection && (
        <Card aria-label="agent connection">
          <SectionHeader
            title="Hermes agent connection"
            trailing={<Pill tone={connectionTone(agentConnection.state)}>{agentConnection.state}</Pill>}
          />
          <p style={{ color: theme.muted, fontSize: 13, margin: '0.35rem 0 0.5rem' }}>
            Live heartbeat from <code>operator_agent_presence</code> · status endpoint <code>/api/hermes/operator-gateway/status</code>
          </p>
          {agentConnection.state === 'connected' ? (
            <p style={{ color: theme.ok, fontSize: 14, marginTop: 0 }}>
              Agent online — last heartbeat {agentConnection.freshestAgeSeconds}s ago.
            </p>
          ) : agentConnection.state === 'stale' ? (
            <p style={{ color: theme.warn, fontSize: 14, marginTop: 0 }}>
              Agent heartbeat is stale — last seen {agentConnection.freshestAgeSeconds}s ago. It may be paused or offline.
            </p>
          ) : (
            <p style={{ color: theme.warnAlt, fontSize: 14, marginTop: 0 }}>
              {agentConnection.source === 'not_provisioned'
                ? 'Agent bridge not provisioned yet — presence table missing or unreachable.'
                : 'No agent has checked in. Start the local Hermes runner to bring the bridge online.'}
            </p>
          )}
          {agentConnection.agents.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr>
                  <th style={th}>Agent</th>
                  <th style={th}>Host</th>
                  <th style={th}>Version</th>
                  <th style={th}>State</th>
                  <th style={th}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {agentConnection.agents.map((a) => (
                  <tr key={a.agentId}>
                    <td style={td}>{a.agentId}</td>
                    <td style={td}>{a.hostname ?? '—'}</td>
                    <td style={td}>{a.agentVersion ?? '—'}</td>
                    <td style={td}>
                      <Pill tone={connectionTone(a.state)}>{a.state}</Pill>
                    </td>
                    <td style={td}>{a.ageSeconds}s ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* GROUP 1 — Runtime monitor: multi-CLI runtime topology + runner telemetry. */}
      <CollapsibleGroup
        title="Runtime monitor"
        ariaLabel="multi cli runtime monitor"
        tone={view.runtimeTopology.blockedInstallCount > 0 ? 'warn' : 'ok'}
        summary={`${view.runtimeTopology.nodeCount} nodes · ${view.runtimeTopology.activeNodeCount} active · ${view.runnerTelemetry.connectedMonitorCount}/${view.runnerTelemetry.monitorCount} monitors`}
      >
        <h3 style={{ fontSize: 16, marginTop: '1rem' }}>Mission Control Runtime Monitor · Multi-CLI topology</h3>
        <p style={{ color: theme.ok, fontSize: 14 }}>
          Registry view only: Hermes, Codex, and skill execution are declared active. Claude Code, MiniMax, and Cursor remain install/login blocked until runtime telemetry proves otherwise.
        </p>
        <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/runtime-topology</code></p>
        <div style={grid}>
          <p>Runtime nodes: <b>{view.runtimeTopology.nodeCount}</b></p>
          <p>Active nodes: <b>{view.runtimeTopology.activeNodeCount}</b></p>
          <p>Install-blocked nodes: <b>{view.runtimeTopology.blockedInstallCount}</b></p>
          <p>Telemetry monitors: <b>{view.runnerTelemetry.monitorCount}</b></p>
          <p>Telemetry connected: <b>{view.runnerTelemetry.connectedMonitorCount}</b></p>
          <p>Telemetry blocked: <b>{view.runnerTelemetry.blockedMonitorCount}</b></p>
          <StatusRow label="No shared credentials" value={view.runtimeTopology.noSharedCredentials} safeWhenFalse={false} />
          <StatusRow label="No API-key mode" value={view.runtimeTopology.noApiKeyMode} safeWhenFalse={false} />
          <StatusRow label="Production execution enabled" value={view.runtimeTopology.productionExecutionEnabled} />
          <StatusRow label="Browser automation requires main operator" value={view.runtimeTopology.browserAutomationRequiresMainOperator} safeWhenFalse={false} />
          <StatusRow label="Board governance required" value={view.runtimeTopology.boardGovernanceRequired} safeWhenFalse={false} />
        </div>
        <div style={grid}>
          {view.runtimeTopology.nodes.map((node) => (
            <div key={node.nodeId} style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 2, padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: 15, margin: 0 }}>{node.displayName}</h4>
                  <p style={{ color: theme.muted, fontSize: 12, margin: '0.2rem 0 0' }}>{node.monitorSlot} · {node.role} · reports to {node.reportsTo ?? 'operator'}</p>
                </div>
                <Pill tone={runtimeTone(node.status)}>{node.status}</Pill>
              </div>
              <p style={{ margin: '0.35rem 0' }}><b>{node.tool}</b></p>
              <p style={{ color: theme.muted, fontSize: 13, margin: '0.35rem 0' }}>{node.planAllocation}</p>
              <p style={{ color: theme.muted, fontSize: 13, margin: '0.35rem 0' }}>{node.workspaceIsolation}</p>
              <p style={{ color: node.status === 'active' ? theme.ok : theme.warnAlt, fontSize: 13, marginBottom: 0 }}>{node.nextAction}</p>
            </div>
          ))}
        </div>
        <div style={{ ...grid, marginTop: '1rem' }}>
          <div>
            <h4 style={{ fontSize: 15 }}>Telemetry contract</h4>
            <p style={{ color: theme.muted, fontSize: 13 }}>Endpoint: <code>/api/hermes/operator-gateway/runner-telemetry</code></p>
            <StatusRow label="Dispatch enabled" value={view.runnerTelemetry.dispatchEnabled} />
            <StatusRow label="Live runner enabled" value={view.runnerTelemetry.liveRunnerEnabled} />
            <p>Next gate: <code>{view.runnerTelemetry.nextGate}</code></p>
            {view.runnerTelemetry.monitors.slice(0, 5).map((monitor) => (
              <div key={monitor.nodeId} style={{ borderTop: `1px solid ${theme.borderSoft}`, paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <b>{monitor.monitorSlot}</b>{' '}
                <Pill tone={runtimeTone(monitor.heartbeatStatus === 'local_status_only' || monitor.heartbeatStatus === 'operator_visible' ? 'active' : monitor.heartbeatStatus)}>{monitor.heartbeatStatus}</Pill>
                <p style={{ color: theme.muted, fontSize: 12, margin: '0.25rem 0 0' }}>{monitor.requiredEvidence.join(', ')}</p>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: 15 }}>Evidence flow</h4>
            <ol style={{ color: theme.muted, fontSize: 14, paddingLeft: '1.25rem' }}>
              {view.runtimeTopology.dataFlow.map((step) => <li key={step} style={{ marginBottom: '0.35rem' }}>{step}</li>)}
            </ol>
          </div>
          <div>
            <h4 style={{ fontSize: 15 }}>Open gates</h4>
            {view.runtimeTopology.openGates.map((gate) => (
              <div key={gate} style={{ marginBottom: '0.5rem' }}>
                <Pill tone="warn">blocked</Pill>{' '}
                <code style={{ color: theme.muted, fontSize: 12 }}>{gate}</code>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: theme.muted, fontSize: 13 }}>{view.runtimeTopology.nextBuildStep}</p>
      </CollapsibleGroup>

      {/* GROUP 2 — Lanes & jobs: lane selector, job queue, sandbox dry-run queue,
          controlled real-local execution, senior PM action queue. */}
      <CollapsibleGroup
        title="Lanes & jobs"
        ariaLabel="lanes and jobs"
        tone={activeLanes.length > 0 ? 'ok' : 'warn'}
        summary={`${activeLanes.length} active lanes · ${view.jobQueue.jobCount} jobs · ${view.controlledLocalExecution.status}`}
      >
        {/* Job queue / safety summary cards */}
        <section style={{ ...grid, marginTop: '1rem' }} aria-label="job queue summary">
          <Card style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Job queue</h3>
            <StatusRow label="Sandbox persistence" value={view.jobQueue.source === 'sandbox_select'} safeWhenFalse={false} />
            <StatusRow label="Production connected" value={view.jobQueue.source === 'production'} safeWhenFalse={false} />
            <StatusRow label="Connected" value={view.jobQueue.connected} safeWhenFalse={false} />
            <p>Source: <code>{view.jobQueue.source}</code></p>
            <StatusRow label="Live runner enabled" value={false} />
            <StatusRow label="Live execution" value={view.jobQueue.liveExecution} />
            <StatusRow label="External execution disabled" value={!view.externalExecutionEnabled} safeWhenFalse={false} />
            <StatusRow label="Job creation enabled" value={view.jobSubmission.enabled} safeWhenFalse={false} />
            <StatusRow label="Dry-run execution enabled" value={view.dryRunExecution.enabled} safeWhenFalse={false} />
            <p>Controlled real-local execution: <Pill tone="ok">{view.controlledLocalExecution.status}</Pill></p>
            <p>Local foundation endpoint: <code>{view.controlledLocalExecution.endpoint}</code></p>
            <p>Jobs visible: <b>{view.jobQueue.jobCount}</b></p>
            {view.jobQueue.source === 'sandbox_select' && view.jobQueue.jobCount === 0 ? (
              <p style={{ color: theme.ok, fontSize: 13 }}>Sandbox connected empty state: no operator jobs recorded yet.</p>
            ) : null}
            <p style={{ color: theme.muted, fontSize: 13 }}>{view.jobQueue.note}</p>
          </Card>
          <Card style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Board decision</h3>
            <p><b>{view.boardDecisionPanel.currentDecision}</b></p>
            <p>Status: <Pill tone="ok">{view.boardDecisionPanel.status}</Pill></p>
            <p>Reviewer: {view.boardDecisionPanel.reviewer}</p>
            <p>Next Board gate: <b>{view.boardDecisionPanel.nextBoardGate}</b></p>
          </Card>
        </section>

        {/* Controlled real-local execution */}
        <Card aria-label="controlled real-local execution">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Controlled real-local execution · local_foundation_ready</h3>
          <p style={{ color: theme.ok, fontSize: 14 }}>Controlled real-local execution design status is local_foundation_ready. The foundation validates policy, appends sandbox events, and can update sandbox job status, but dispatch remains disabled.</p>
          <p style={{ color: theme.warnAlt, fontSize: 13 }}>Hard-gated actions refused: production DB, deploy, migrations, secrets/OP/1Password, API keys, external services, browser automation, Computer Use, email, payments, claims, orders, and public/client actions.</p>
          <p style={{ color: theme.muted, fontSize: 13 }}>active Hermes/Codex/skill-exec lanes: {view.controlledLocalExecution.activeLanes.join(', ')}</p>
          <p style={{ color: theme.muted, fontSize: 13 }}>pending Claude/MiniMax/Cursor lanes: {view.controlledLocalExecution.pendingLanes.join(', ')}</p>
          <StatusRow label="External execution enabled" value={view.controlledLocalExecution.externalExecutionEnabled} />
          <StatusRow label="Live runner enabled" value={view.controlledLocalExecution.liveRunnerEnabled} />
          <StatusRow label="Production connected" value={view.controlledLocalExecution.productionConnected} safeWhenFalse={false} />
          <StatusRow label="Dispatch performed" value={view.controlledLocalExecution.dispatchEnabled} />
          <code>/api/hermes/operator-gateway/jobs/local-execution</code>
        </Card>

        {/* Lane selector */}
        <Card aria-label="lane selector">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Lane selector</h3>
          <p style={{ color: theme.muted, fontSize: 14 }}>
            {activeLanes.length} active lanes · {inactiveLanes.length} inactive/blocked lanes · all lanes visible · all lanes apiKeyRequired=false.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Lane</th>
                <th style={th}>Auth</th>
                <th style={th}>Status</th>
                <th style={th}>External</th>
                <th style={th}>Production</th>
                <th style={th}>Blocked reason</th>
              </tr>
            </thead>
            <tbody>
              {view.lanes.map((lane) => (
                <tr key={lane.laneId}>
                  <td style={td}>
                    <b>{lane.displayName}</b>
                    <div style={{ color: theme.muted, fontSize: 12 }}>{lane.laneId} · {lane.tool}</div>
                    <div style={{ color: theme.ok, fontSize: 12 }}>{lane.safetyLabel}</div>
                  </td>
                  <td style={td}>{lane.authMode}</td>
                  <td style={td}><Pill tone={lane.status === 'active' ? 'ok' : 'warn'}>{lane.status}</Pill></td>
                  <td style={td}><Pill tone={lane.externalActionAllowed ? 'bad' : 'ok'}>{lane.externalActionAllowed ? 'yes' : 'no'}</Pill></td>
                  <td style={td}><Pill tone={lane.productionActionAllowed ? 'bad' : 'ok'}>{lane.productionActionAllowed ? 'yes' : 'no'}</Pill></td>
                  <td style={td}>{lane.blockedReason ?? 'ready for safe local planning only'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Sandbox job creation / queue / senior PM queue */}
        <section style={grid}>
          <Card style={{ marginBottom: 0 }} aria-label="new sandbox job form">
            <h3 style={{ fontSize: 16, marginTop: 0 }}>
              {view.jobSubmission.enabled
                ? 'Create sandbox job · sandbox job creation enabled'
                : 'Create sandbox job · currently disabled'}
            </h3>
            <p style={{ color: view.jobSubmission.enabled ? theme.ok : theme.warnAlt, fontSize: 14 }}>{view.jobSubmission.disabledReason}</p>
            <p style={{ color: theme.warnAlt, fontSize: 13 }}>
              Hard-gate warning: production DB writes, deployment, API-key requests, payments, email, claims, orders, external execution, and live runner activation are refused.
            </p>
            <form method="post" action="/api/hermes/operator-gateway/jobs">
              <label style={{ display: 'block', marginBottom: '0.7rem' }}>
                <span style={{ display: 'block', fontSize: 12, color: theme.muted, marginBottom: 4 }}>Lane</span>
                <select name="laneId" required style={{ ...inputStyle, color: theme.text }} defaultValue="hermes_local">
                  {view.lanes.map((lane) => <option key={lane.laneId} value={lane.laneId}>{lane.laneId}</option>)}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: '0.7rem' }}>
                <span style={{ display: 'block', fontSize: 12, color: theme.muted, marginBottom: 4 }}>Job title</span>
                <input name="title" required minLength={3} maxLength={160} style={{ ...inputStyle, color: theme.text }} placeholder="Sandbox-only planned job" />
              </label>
              <label style={{ display: 'block', marginBottom: '0.7rem' }}>
                <span style={{ display: 'block', fontSize: 12, color: theme.muted, marginBottom: 4 }}>Task type</span>
                <select name="taskType" required style={{ ...inputStyle, color: theme.text }} defaultValue="documentation">
                  {view.jobSubmission.allowedTaskTypes.map((task) => <option key={task} value={task}>{task}</option>)}
                </select>
              </label>
              <input type="hidden" name="externalActionRequested" value="false" />
              <input type="hidden" name="productionActionRequested" value="false" />
              <input type="hidden" name="apiKeyRequested" value="false" />
              <button
                type="submit"
                disabled={!view.jobSubmission.enabled}
                style={{
                  ...inputStyle,
                  color: theme.ok,
                  fontWeight: 700,
                  opacity: view.jobSubmission.enabled ? 1 : 0.6,
                  cursor: view.jobSubmission.enabled ? 'pointer' : 'not-allowed',
                }}
              >
                Create sandbox job
              </button>
            </form>
            <p style={{ color: theme.muted, fontSize: 12 }}>
              This creates a sandbox `operator_jobs` row only. It does not execute the job and does not connect production.
            </p>
          </Card>

          <Card style={{ marginBottom: 0 }} aria-label="operator job queue">
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Operator job queue · live (production)</h3>
            <p style={{ color: theme.ok, fontSize: 13 }}>Read live from prod operator_jobs (founder-scoped). The agent claims queued jobs and runs SAFE lanes only (read-only diagnostics); hard-gated tasks are blocked with an event. The buttons below remain dry-run / policy-foundation only.</p>
            {jobsView?.jobs.length ? (
              <DeckDetails
                title="Jobs"
                stats={`${jobsView.jobs.length} job${jobsView.jobs.length === 1 ? '' : 's'} · dry-run only`}
                testId="operator-jobs-details"
              >
                {jobsView.jobs.slice(0, DECK_LIST_CAP).map((job) => (
              <div key={job.id} style={{ borderBottom: `1px solid ${theme.borderSoft}`, padding: '0.6rem 0' }}>
                <div><b>{job.title}</b> <Pill tone="info">{job.status}</Pill></div>
                <div style={{ color: theme.muted, fontSize: 13 }}>{job.laneId} · {job.taskType}</div>
                <div style={{ color: theme.ok, fontSize: 12 }}>apiKeyRequested=false · externalExecution=false · liveRunner=false</div>
                <form method="post" action="/api/hermes/operator-gateway/jobs/dry-run" style={{ marginTop: '0.5rem' }}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="dryRunReason" value="Command Centre dry-run-only execution selected" />
                  <input type="hidden" name="externalActionRequested" value="false" />
                  <input type="hidden" name="productionActionRequested" value="false" />
                  <input type="hidden" name="apiKeyRequested" value="false" />
                  <button
                    type="submit"
                    disabled={!view.dryRunExecution.enabled || job.status !== 'planned' || job.externalActionRequested || job.productionActionRequested || job.apiKeyRequested}
                    style={{
                      ...inputStyle,
                      color: theme.ok,
                      fontWeight: 700,
                      opacity: view.dryRunExecution.enabled && job.status === 'planned' ? 1 : 0.6,
                      cursor: view.dryRunExecution.enabled && job.status === 'planned' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Dry-run only · append event + update sandbox status
                  </button>
                </form>
                <form method="post" action="/api/hermes/operator-gateway/jobs/local-execution" style={{ marginTop: '0.5rem' }}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="laneId" value={job.laneId} />
                  <input type="hidden" name="taskType" value={job.taskType} />
                  <input type="hidden" name="localOnly" value="true" />
                  <input type="hidden" name="requestedCommand" value="policy foundation only; dispatch disabled" />
                  <input type="hidden" name="externalActionRequested" value="false" />
                  <input type="hidden" name="productionActionRequested" value="false" />
                  <input type="hidden" name="apiKeyRequested" value="false" />
                  <input type="hidden" name="browserAutomationRequested" value="false" />
                  <input type="hidden" name="computerUseRequested" value="false" />
                  <button
                    type="submit"
                    disabled={!view.controlledLocalExecution.enabled || job.status !== 'planned' || job.externalActionRequested || job.productionActionRequested || job.apiKeyRequested}
                    style={{
                      ...inputStyle,
                      color: theme.ok,
                      fontWeight: 700,
                      opacity: view.controlledLocalExecution.enabled && job.status === 'planned' ? 1 : 0.6,
                      cursor: view.controlledLocalExecution.enabled && job.status === 'planned' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Request controlled local foundation · policy/event/status only
                  </button>
                </form>
              </div>
                ))}
                <DeckMoreLine total={jobsView.jobs.length} shown={Math.min(jobsView.jobs.length, DECK_LIST_CAP)} />
              </DeckDetails>
            ) : <p style={{ color: theme.muted, fontSize: 14 }}>No operator jobs yet. Queue one (operator_jobs, status=queued) and the agent claims it on its next sweep.</p>}
          </Card>

          <Card style={{ marginBottom: 0 }} aria-label="operator job activity">
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Recent job activity</h3>
            {jobEvents.length ? (
              <DeckDetails
                title="Events"
                stats={`${jobEvents.length} event${jobEvents.length === 1 ? '' : 's'} · newest first`}
                testId="operator-job-events-details"
              >
                {jobEvents.slice(0, DECK_LIST_CAP).map((ev) => (
                  <div key={ev.id} style={{ borderBottom: `1px solid ${theme.borderSoft}`, padding: '0.45rem 0', fontSize: 13 }}>
                    <span style={{ color: theme.muted, fontFamily: 'var(--font-mono, monospace)' }}>{new Date(ev.at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane' })}</span>{' '}
                    <Pill tone={ev.eventType === 'gate_blocked' ? 'bad' : ev.toStatus === 'done' ? 'ok' : 'info'}>{ev.eventType}</Pill>{' '}
                    {ev.fromStatus && ev.toStatus ? (
                      <span style={{ color: theme.muted }}>{ev.fromStatus}→{ev.toStatus} · </span>
                    ) : null}
                    <span>{ev.detail}</span>
                  </div>
                ))}
                <DeckMoreLine total={jobEvents.length} shown={Math.min(jobEvents.length, DECK_LIST_CAP)} />
              </DeckDetails>
            ) : (
              <p style={{ color: theme.muted, fontSize: 14 }}>No job events yet. Agent claim / execution / block events stream here.</p>
            )}
          </Card>

          <Card style={{ marginBottom: 0 }} aria-label="senior pm next action queue">
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Senior PM next action queue</h3>
            {view.seniorPmQueue.items.map((item) => (
              <div key={item.id} style={{ borderBottom: `1px solid ${theme.borderSoft}`, padding: '0.6rem 0' }}>
                <div><b>{item.title}</b> <Pill tone={item.status === 'completed' ? 'ok' : 'warn'}>{item.status}</Pill></div>
                <div style={{ color: theme.muted, fontSize: 13 }}>{item.nextAction}</div>
              </div>
            ))}
          </Card>
        </section>
      </CollapsibleGroup>

      {/* GROUP 3 — Skills & routing: self-evolving skill mesh, specialised skill mesh,
          compound engineering connectors, business mission router. */}
      <CollapsibleGroup
        title="Skills & routing"
        ariaLabel="skills and routing"
        tone="ok"
        summary={`${view.skillMesh.specializedSkillCount} specialised skills · ${view.compoundEngineering.connectorCount} connectors · ${view.skillEvolution.skillsUnderEvaluation} under eval`}
      >
        {/* Self-evolving skill mesh */}
        <Card aria-label="self-evolving skill mesh" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Self-Evolving Skill Mesh</h3>
          <p style={{ color: theme.ok, fontSize: 14 }}>
            Local foundation ready: baseline skill → feedback/evals → prompt candidate → gated promotion/rollback. Read-only status only; no live skill mutation.
          </p>
          <p style={{ color: theme.muted, fontSize: 13 }}>Source: <code>{view.skillEvolution.source}</code></p>
          <div style={grid}>
            <p>Skills under evaluation: <b>{view.skillEvolution.skillsUnderEvaluation}</b></p>
            <p>Graders defined: <b>{view.skillEvolution.gradersDefined}</b></p>
            <p>Prompt versions tracked: <b>{view.skillEvolution.promptVersionsTracked}</b></p>
            <p>Promotion candidates: <b>{view.skillEvolution.promotionCandidates}</b></p>
            <p>Blocked promotions: <b>{view.skillEvolution.blockedPromotions}</b></p>
            <p>Rollback paths available: <b>{view.skillEvolution.rollbackAvailableCount}</b></p>
          </div>
          <p>Next skill to evaluate: <b>{view.skillEvolution.nextRecommendedSkillToEvaluate}</b></p>
          <p>Latest eval run: <code>{view.skillEvolution.latestEvalRun.evalRunId}</code> · score {view.skillEvolution.latestEvalRun.score} / threshold {view.skillEvolution.latestEvalRun.passThreshold}</p>
          <StatusRow label="No API-key mode" value={view.skillEvolution.noApiKeyMode} safeWhenFalse={false} />
          <StatusRow label="External eval API called" value={view.skillEvolution.externalEvalApiCalled} />
          <StatusRow label="Paid API eval called" value={view.skillEvolution.paidApiEvalCalled} />
          <StatusRow label="Live auto-promotion enabled" value={view.skillEvolution.liveAutoPromotionEnabled} />
          <StatusRow label="Production auto-promotion allowed" value={view.skillEvolution.productionAutoPromotionAllowed} />
          <StatusRow label="Production DB touched" value={view.skillEvolution.productionDbTouched} />
          <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/skill-evolution</code></p>
        </Card>

        {/* Compound engineering connectors */}
        <Card aria-label="compound engineering connectors">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Compound Engineering Connectors</h3>
          <p style={{ color: theme.ok, fontSize: 14 }}>
            Matt Van Horn / Every pattern mapped into Unite-Group: setup, serial review, research scout, design studio, workflow loop, and 2nd-brain knowledge capture connectors.
          </p>
          <p style={{ color: theme.muted, fontSize: 13 }}>Source: <code>{view.compoundEngineering.source}</code></p>
          <div style={grid}>
            <p>Connectors mapped: <b>{view.compoundEngineering.connectorCount}</b></p>
            <p>Ready connectors: <b>{view.compoundEngineering.readyConnectors}</b></p>
            <p>Pending install: <b>{view.compoundEngineering.pendingInstallConnectors}</b></p>
            <p>Blocked gates: <b>{view.compoundEngineering.blockedGateConnectors}</b></p>
            <p>Upstream skills: <b>{view.compoundEngineering.upstream.observedCapabilities.skills}</b></p>
            <p>Upstream agents: <b>{view.compoundEngineering.upstream.observedCapabilities.agents}</b></p>
          </div>
          <p>Next connector: <b>{view.compoundEngineering.nextRecommendedConnector}</b></p>
          <p>{view.compoundEngineering.nextPortfolioAction}</p>
          <StatusRow label="No API-key mode" value={view.compoundEngineering.noApiKeyMode} safeWhenFalse={false} />
          <StatusRow label="Auto-install enabled" value={view.compoundEngineering.autoInstallEnabled} />
          <StatusRow label="External execution enabled" value={view.compoundEngineering.externalExecutionEnabled} />
          <StatusRow label="Production DB touched" value={view.compoundEngineering.productionDbTouched} />
          <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/compound-engineering</code></p>
        </Card>

        {/* Specialised skill mesh + business mission router */}
        <section style={grid} aria-label="specialized skill mesh">
          <Card style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Specialised Skill Mesh</h3>
            <p style={{ color: theme.muted, fontSize: 13 }}>Source: <code>{view.skillMesh.source ?? 'not_connected'}</code></p>
            <p style={{ color: theme.ok, fontSize: 14 }}>Available specialised skills: <b>{view.skillMesh.specializedSkillCount}</b></p>
            <p style={{ color: theme.ok, fontSize: 14 }}>Business mission templates: <b>{view.skillMesh.businessMissionTemplateCount}</b></p>
            <p>Active lanes: <code>{view.skillMesh.activeLanes.join(', ')}</code></p>
            <p>Pending lanes: <code>{view.skillMesh.pendingLanes.join(', ')}</code></p>
            <p>Blocked lanes: <code>{view.skillMesh.blockedLanes.join(', ')}</code></p>
            <p style={{ color: theme.warnAlt, fontSize: 13 }}>sandbox_voice_migration_blocked_op remains BLOCKED-OP until 1Password CLI authentication is green.</p>
            <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/skill-mesh</code></p>
          </Card>
          <Card style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: 16, marginTop: 0 }}>Business Mission Router</h3>
            <p style={{ color: theme.muted, fontSize: 13 }}>Source: <code>{view.missionRouter.source ?? view.skillMesh.source ?? 'not_connected'}</code> (sample route)</p>
            <p>Status: <Pill tone="ok">{view.missionRouter.status}</Pill></p>
            <p>Sample objective: <b>{view.missionRouter.sampleObjective}</b></p>
            <p>Selected template: <code>{view.missionRouter.sampleRoute.selectedTemplateId}</code></p>
            <p>First 20-action mission route: <b>{view.missionRouter.sampleRoute.actions.length}</b> sandbox job candidates</p>
            <StatusRow label="External execution remains disabled" value={view.missionRouter.externalExecutionEnabled} />
            <StatusRow label="Live runner enabled" value={view.missionRouter.liveRunnerEnabled} />
            <StatusRow label="API-key mode" value={view.missionRouter.sampleRoute.apiKeyMode} />
            <p style={{ color: theme.muted, fontSize: 13 }}>Skill team: {view.missionRouter.sampleRoute.selectedSkillTeam.join(', ')}</p>
          </Card>
        </section>
      </CollapsibleGroup>

      {/* GROUP 4 — Voice & 2nd brain: mobile voice intake, latest compound moves. */}
      <CollapsibleGroup
        title="Voice & 2nd brain"
        ariaLabel="voice and second brain"
        tone={view.latestMobileVoiceCompoundMoves.status === 'available' ? 'ok' : 'warn'}
        summary={`Plaud intake · ${view.latestMobileVoiceCompoundMoves.moveCount} compound moves (${view.latestMobileVoiceCompoundMoves.status})`}
      >
        {/* Mobile voice intake */}
        <Card aria-label="mobile voice intake" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Mobile Voice Intake · Plaud to 2nd brain</h3>
          <p style={{ color: theme.ok, fontSize: 14 }}>
            Mobile-first capture is ready for Plaud transcripts, driving thoughts, podcast notes, audio-book ideas, and field conversations. Captures become Obsidian source notes, research prompts, and Board review packets before Hermes creates tasks.
          </p>
          <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/mobile-voice-intake</code></p>
          <div style={grid}>
            <StatusRow label="Mobile first" value={view.mobileVoiceIntake.mobileFirst} safeWhenFalse={false} />
            <StatusRow label="Plaud supported" value={view.mobileVoiceIntake.plaudSupported} safeWhenFalse={false} />
            <StatusRow label="Research expansion enabled" value={view.mobileVoiceIntake.researchExpansionEnabled} safeWhenFalse={false} />
            <StatusRow label="Packet persistence enabled" value={view.mobileVoiceIntake.packetPersistenceEnabled} safeWhenFalse={false} />
            <StatusRow label="Source note writing enabled" value={view.mobileVoiceIntake.sourceNoteWriteEnabled} safeWhenFalse={false} />
            <StatusRow label="Board packet generation enabled" value={view.mobileVoiceIntake.boardPacketGenerationEnabled} safeWhenFalse={false} />
            <StatusRow label="Board review required" value={view.mobileVoiceIntake.boardReviewRequired} safeWhenFalse={false} />
            <StatusRow label="Hermes queue required" value={view.mobileVoiceIntake.hermesQueueRequired} safeWhenFalse={false} />
            <StatusRow label="No raw audio storage" value={view.mobileVoiceIntake.noRawAudioStorage} safeWhenFalse={false} />
            <StatusRow label="External dispatch enabled" value={view.mobileVoiceIntake.externalDispatchEnabled} />
            <StatusRow label="Auto publish enabled" value={view.mobileVoiceIntake.autoPublishEnabled} />
          </div>
          <div style={grid}>
            <div>
              <h4 style={{ fontSize: 15 }}>Ingress modes</h4>
              <ul style={{ color: theme.muted, fontSize: 14 }}>
                {view.mobileVoiceIntake.plaudIngressModes.map((mode) => <li key={mode}><code>{mode}</code></li>)}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 15 }}>2nd brain evidence</h4>
              <p style={{ color: theme.muted, fontSize: 13 }}>{view.mobileVoiceIntake.secondBrainTarget} · {view.mobileVoiceIntake.obsidianCaptureMode}</p>
              <ul style={{ color: theme.muted, fontSize: 14 }}>
                {view.mobileVoiceIntake.requiredEvidence.map((evidence) => <li key={evidence}><code>{evidence}</code></li>)}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 15 }}>Open gates</h4>
              {view.mobileVoiceIntake.openGates.map((gate) => (
                <div key={gate} style={{ marginBottom: '0.5rem' }}>
                  <Pill tone="warn">blocked</Pill>{' '}
                  <code style={{ color: theme.muted, fontSize: 12 }}>{gate}</code>
                </div>
              ))}
            </div>
          </div>
          <p style={{ color: theme.muted, fontSize: 13 }}>{view.mobileVoiceIntake.nextAction}</p>
        </Card>

        {/* Latest Next 20 compound moves */}
        <Card aria-label="latest mobile voice next 20 compound moves">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Latest Next 20 · 2nd-brain compound moves</h3>
          <p style={{ color: view.latestMobileVoiceCompoundMoves.status === 'available' ? theme.ok : theme.warnAlt, fontSize: 14 }}>
            {view.latestMobileVoiceCompoundMoves.note}
          </p>
          <div style={grid}>
            <p>Status: <Pill tone={view.latestMobileVoiceCompoundMoves.status === 'available' ? 'ok' : 'warn'}>{view.latestMobileVoiceCompoundMoves.status}</Pill></p>
            <p>Move count: <b>{view.latestMobileVoiceCompoundMoves.moveCount}</b></p>
            <StatusRow label="Hermes queue enabled" value={view.latestMobileVoiceCompoundMoves.hermesQueueEnabled} />
            <StatusRow label="Linear task created" value={view.latestMobileVoiceCompoundMoves.linearTaskCreated} />
            <StatusRow label="External dispatch enabled" value={view.latestMobileVoiceCompoundMoves.externalDispatchEnabled} />
            <p>Next gate: <code>{view.latestMobileVoiceCompoundMoves.nextApprovalGate}</code></p>
          </div>
          <p style={{ color: theme.muted, fontSize: 13 }}>
            2nd-brain root: <code>{view.latestMobileVoiceCompoundMoves.secondBrainRoot}</code>
          </p>
          {view.latestMobileVoiceCompoundMoves.relativePath ? (
            <p style={{ color: theme.muted, fontSize: 13 }}>
              Artifact: <code>{view.latestMobileVoiceCompoundMoves.relativePath}</code>
            </p>
          ) : null}
          {view.latestMobileVoiceCompoundMoves.title ? (
            <p><b>{view.latestMobileVoiceCompoundMoves.title}</b></p>
          ) : null}
          {view.latestMobileVoiceCompoundMoves.previewMoves.length ? (
            <div style={grid}>
              {view.latestMobileVoiceCompoundMoves.previewMoves.map((move) => (
                <div key={`${move.rank}-${move.title}`} style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 2, padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
                    <b>{move.rank}. {move.title}</b>
                    <Pill tone="info">{move.lane ?? 'move'}</Pill>
                  </div>
                  <p style={{ color: theme.muted, fontSize: 13, margin: '0.35rem 0' }}>{move.agent ?? 'unassigned agent'}</p>
                  <p style={{ color: theme.warnAlt, fontSize: 12, marginBottom: 0 }}>Gate: <code>{move.stopGate ?? 'approval_required'}</code></p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: theme.muted, fontSize: 14 }}>
              Run <code>pnpm mobile-voice:approve-board-packet -- --write-artifact</code> after a Board packet is created to populate this panel.
            </p>
          )}
        </Card>
      </CollapsibleGroup>

      {/* GROUP 5 — Projects & decisions: project DoD coverage, board decision engine/panel. */}
      <CollapsibleGroup
        title="Projects & decisions"
        ariaLabel="projects and decisions"
        tone={view.boardDecisionPanel.engine.nextRecommendedAction === 'act_now' ? 'ok' : 'warn'}
        summary={`${view.projectCoverage.projectsWithDodSpecs} projects · ${view.projectCoverage.averageCoveragePercent}% avg coverage · ${view.boardDecisionPanel.engine.candidateMovesScored} moves scored`}
      >
        {/* Project definition-of-done coverage */}
        <Card aria-label="project definition of done coverage" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Project Definition of Done Engine · Project coverage</h3>
          <p style={{ color: theme.ok, fontSize: 14 }}>
            false-done prevention active: project done is only green when authoritative DoD coverage passes threshold and hard gates are closed.
          </p>
          <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/project-coverage</code></p>
          <div style={grid}>
            <p>Projects with DoD specs: <b>{view.projectCoverage.projectsWithDodSpecs}</b></p>
            <p>Average coverage: <b>{view.projectCoverage.averageCoveragePercent}%</b></p>
            <p>Requirements tracked: <b>{view.projectCoverage.requirementCount}</b></p>
            <p>Project done count: <b>{view.projectCoverage.projectDoneCount}</b></p>
            <p>Missing requirements: <b>{view.projectCoverage.missingRequirementCount}</b></p>
            <p>Blocked requirements: <b>{view.projectCoverage.blockedRequirementCount}</b></p>
          </div>
          <p>Next project to reconcile: <b>{view.projectCoverage.nextProjectToReconcile.projectName}</b> · {view.projectCoverage.nextProjectToReconcile.coveragePercent}% coverage</p>
          <div style={grid}>
            {view.projectCoverage.projects.map((project) => (
              <div key={project.projectId} style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 2, padding: '0.75rem' }}>
                <h4 style={{ fontSize: 15, marginTop: 0 }}>{project.projectName}</h4>
                <p>Coverage: <b>{project.coveragePercent}%</b> · project done: <Pill tone={project.projectDone ? 'ok' : 'bad'}>{project.projectDone ? 'yes' : 'no'}</Pill></p>
                <p>missing requirements: <b>{project.missingRequirements.length}</b> · hard-gate failures: <b>{project.failedHardGateCount}</b></p>
                <p style={{ color: project.projectDone ? theme.ok : theme.warnAlt, fontSize: 12 }}>{project.judgementStatus}</p>
              </div>
            ))}
          </div>
          <h4 style={{ fontSize: 15 }}>Senior PM next generated jobs</h4>
          <ul style={{ color: theme.muted, fontSize: 14 }}>
            {view.projectCoverage.nextGeneratedJobs.slice(0, 6).map((job) => (
              <li key={job.jobId}><b>{job.priority}</b> · {job.projectId} · {job.nextAction}</li>
            ))}
          </ul>
        </Card>

        {/* Board decision mathematics engine */}
        <Card aria-label="board decision mathematics engine">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Board Decision Mathematics Engine</h3>
          <p style={{ color: theme.ok, fontSize: 14 }}>
            Deterministic local decision layer: Expected value + Verification + retry + calibration + coverage target, with irreversible hard gates always escalated.
          </p>
          <p style={{ color: theme.muted, fontSize: 13 }}>Status endpoint: <code>/api/hermes/operator-gateway/command-centre</code></p>
          <div style={grid}>
            <p>Candidate moves scored: <b>{view.boardDecisionPanel.engine.candidateMovesScored}</b></p>
            <p>Recommended action: <Pill tone={view.boardDecisionPanel.engine.nextRecommendedAction === 'act_now' ? 'ok' : 'warn'}>{view.boardDecisionPanel.engine.nextRecommendedAction}</Pill></p>
            <p>Next move: <b>{view.boardDecisionPanel.engine.nextRecommendedMoveId}</b></p>
            <p>Expected value: <b>{view.boardDecisionPanel.engine.expectedValue}</b></p>
            <p>p_success: <b>{Math.round(view.boardDecisionPanel.engine.pSuccess * 100)}%</b></p>
            <p>Coverage impact: <b>{Math.round(view.boardDecisionPanel.engine.coverageImpact * 100)}%</b></p>
            <p>Coverage target: <b>{Math.round(view.boardDecisionPanel.engine.coverageTarget * 100)}%</b></p>
            <StatusRow label="Verification requirement" value={view.boardDecisionPanel.engine.verificationRequired} safeWhenFalse={false} />
            <p>Calibration status: <Pill tone="ok">{view.boardDecisionPanel.engine.calibrationStatus}</Pill></p>
            <StatusRow label="Human approval required" value={view.boardDecisionPanel.engine.humanApprovalRequired} />
            <p>Hard gates detected: <b>{view.boardDecisionPanel.engine.hardGatesDetected}</b></p>
            <StatusRow label="No hard gates bypassed" value={view.boardDecisionPanel.engine.hardGatesBypassed === 0} safeWhenFalse={false} />
            <StatusRow label="market launch action disabled" value={view.boardDecisionPanel.engine.marketLaunchActionDisabled} safeWhenFalse={false} />
            <StatusRow label="External execution enabled" value={view.boardDecisionPanel.engine.externalExecutionEnabled} />
          </div>
          <p style={{ color: theme.warnAlt, fontSize: 13 }}>
            EV is never permission to deploy, charge, publish, email, mutate production, or override BLOCKED-OP. Human approval remains mandatory for irreversible moves.
          </p>
        </Card>
      </CollapsibleGroup>

      {/* GROUP 6 — Safety & gates: safety status flags + hard-gate warnings.
          Summary shows "all green" when every safety flag is safe. */}
      <CollapsibleGroup
        title="Safety & gates"
        ariaLabel="safety status"
        tone={safetyAllGreen ? 'ok' : 'bad'}
        summary={
          safetyAllGreen
            ? `all gates green ✓ (${safetyFlags.length} flags) · ${blockedGateCount} hard gates blocked`
            : `${safetyIssueCount} issue${safetyIssueCount === 1 ? '' : 's'} of ${safetyFlags.length} flags · ${blockedGateCount} hard gates blocked`
        }
      >
        <Card aria-label="safety status flags" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Safety status</h3>
          <p style={{ color: safetyAllGreen ? theme.ok : theme.bad, fontSize: 14, marginTop: 0 }}>
            {safetyAllGreen
              ? `all gates green ✓ — ${safetyFlags.length} safety flags all safe`
              : `${safetyIssueCount} of ${safetyFlags.length} safety flags require attention`}
          </p>
          {safetyFlags.map((flag) => (
            <StatusRow key={flag.label} label={flag.label} value={flag.value} safeWhenFalse={flag.safeWhenFalse} />
          ))}
        </Card>

        <Card aria-label="hard gates">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Hard-gate warnings</h3>
          {view.blockedGates.map((gate) => (
            <div key={gate.gateId} style={{ marginBottom: '0.8rem' }}>
              <Pill tone={gate.status === 'blocked' ? 'bad' : 'warn'}>{gate.status}</Pill>{' '}
              <b>{gate.gateId}</b>
              <p style={{ color: theme.muted, fontSize: 13, margin: '0.25rem 0 0' }}>{gate.reason}</p>
            </div>
          ))}
        </Card>
      </CollapsibleGroup>

      {/* GROUP 7 — Evidence & audit / ops: daily ops panel, evidence/audit links. */}
      <CollapsibleGroup
        title="Evidence & audit / ops"
        ariaLabel="evidence and ops"
        tone="muted"
        summary={`${view.dailyOps.panels.length} ops panels · ${view.evidencePointers.length} evidence links`}
      >
        <Card aria-label="daily ops status" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Daily ops panel</h3>
          <p>Source: <code>{view.dailyOps.source}</code></p>
          <StatusRow label="External dispatch enabled" value={view.dailyOps.externalDispatchEnabled} />
          <ul style={{ color: theme.muted, fontSize: 14 }}>
            {view.dailyOps.panels.map((panel) => <li key={panel}>{panel}</li>)}
          </ul>
          <p style={{ color: theme.muted, fontSize: 13 }}>{view.dailyOps.note}</p>
        </Card>

        <Card aria-label="evidence and audit links">
          <h3 style={{ fontSize: 16, marginTop: 0 }}>Evidence / audit links</h3>
          <div style={grid}>
            {view.evidencePointers.map((pointer) => (
              <div key={pointer.href} style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 2, padding: '0.75rem' }}>
                <b>{pointer.label}</b>
                <div style={{ color: theme.muted, fontSize: 12 }}>{pointer.source}</div>
                <code style={{ fontSize: 12 }}>{pointer.href}</code>
              </div>
            ))}
          </div>
        </Card>
      </CollapsibleGroup>
    </div>
    </div>
  )
}
