import { getRuntimeTopologyStatus } from './runtime-topology'

export type RunnerHeartbeatStatus =
  | 'operator_visible'
  | 'local_status_only'
  | 'blocked_install'
  | 'design_only'

export interface RunnerMonitorTelemetry {
  monitorSlot: string
  nodeId: string
  displayName: string
  provider: string
  tool: string
  heartbeatStatus: RunnerHeartbeatStatus
  reportsTo: string | null
  lastHeartbeatAt: null
  activeWorktree: string | null
  activeTaskId: string | null
  evidenceChannels: string[]
  requiredEvidence: string[]
  blockedReason: string | null
  nextAction: string
}

export interface RunnerTelemetryStatus {
  source: 'static_runner_monitor_telemetry'
  status: 'read_only_foundation'
  topologySource: ReturnType<typeof getRuntimeTopologyStatus>['source']
  monitorCount: number
  connectedMonitorCount: number
  blockedMonitorCount: number
  dispatchEnabled: false
  liveRunnerEnabled: false
  productionExecutionEnabled: false
  browserAutomationEnabled: false
  computerUseEnabled: false
  noSharedCredentials: true
  telemetryEndpoint: '/api/hermes/operator-gateway/runner-telemetry'
  monitors: RunnerMonitorTelemetry[]
  nextGate: 'connect_runner_heartbeat_events'
  nextAction: string
}

function heartbeatStatusFor(status: string, nodeId: string): RunnerHeartbeatStatus {
  if (nodeId === 'phill_main_cli_dashboard') return 'operator_visible'
  if (nodeId === 'hermes_codex_orchestrator') return 'local_status_only'
  if (status === 'blocked_install') return 'blocked_install'
  return 'design_only'
}

function requiredEvidenceFor(nodeId: string): string[] {
  if (nodeId === 'phill_main_cli_dashboard') return ['approval_record', 'question_log']
  if (nodeId === 'hermes_codex_orchestrator') return ['task_assignment', 'evidence_audit', 'linear_or_kanban_reconcile']
  if (nodeId.startsWith('claude_max_builder')) return ['diff_summary', 'tests_run', 'worktree_status', 'handoff_note']
  if (nodeId === 'minimax_media_agent') return ['asset_manifest', 'quota_snapshot', 'human_review_required']
  if (nodeId === 'obsidian_second_brain') return ['source_note', 'research_summary', 'training_citation']
  return ['board_decision', 'scope_expansion', 'gate_result']
}

function evidenceChannelsFor(nodeId: string): string[] {
  if (nodeId === 'obsidian_second_brain') return ['obsidian_source_note', 'second_brain_evidence_ledger']
  if (nodeId === 'margot_board_senior_pm') return ['board_gate', 'senior_pm_ledger', 'linear_task_generation']
  if (nodeId === 'minimax_media_agent') return ['asset_manifest', 'media_review_queue']
  return ['operator_event', 'worktree_status', 'test_result', 'handoff_note']
}

export function getRunnerTelemetryStatus(): RunnerTelemetryStatus {
  const topology = getRuntimeTopologyStatus()
  const monitors = topology.nodes.map((node): RunnerMonitorTelemetry => {
    const heartbeatStatus = heartbeatStatusFor(node.status, node.nodeId)
    return {
      monitorSlot: node.monitorSlot,
      nodeId: node.nodeId,
      displayName: node.displayName,
      provider: node.provider,
      tool: node.tool,
      heartbeatStatus,
      reportsTo: node.reportsTo,
      lastHeartbeatAt: null,
      activeWorktree: null,
      activeTaskId: null,
      evidenceChannels: evidenceChannelsFor(node.nodeId),
      requiredEvidence: requiredEvidenceFor(node.nodeId),
      blockedReason: heartbeatStatus === 'blocked_install'
        ? 'Operator install/login required before this runner can emit trusted telemetry.'
        : heartbeatStatus === 'design_only'
          ? 'Telemetry contract defined; live heartbeat source not connected yet.'
          : null,
      nextAction: heartbeatStatus === 'operator_visible' || heartbeatStatus === 'local_status_only'
        ? 'Connect heartbeat events without enabling dispatch.'
        : node.nextAction,
    }
  })

  return {
    source: 'static_runner_monitor_telemetry',
    status: 'read_only_foundation',
    topologySource: topology.source,
    monitorCount: monitors.length,
    connectedMonitorCount: monitors.filter((monitor) => monitor.heartbeatStatus === 'operator_visible' || monitor.heartbeatStatus === 'local_status_only').length,
    blockedMonitorCount: monitors.filter((monitor) => monitor.heartbeatStatus === 'blocked_install').length,
    dispatchEnabled: false,
    liveRunnerEnabled: false,
    productionExecutionEnabled: false,
    browserAutomationEnabled: false,
    computerUseEnabled: false,
    noSharedCredentials: true,
    telemetryEndpoint: '/api/hermes/operator-gateway/runner-telemetry',
    monitors,
    nextGate: 'connect_runner_heartbeat_events',
    nextAction: 'Persist runner heartbeat events and evidence receipts, then feed them into the Mission Control monitor without enabling dispatch.',
  }
}
