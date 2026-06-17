import { describe, expect, it } from 'vitest'
import { getRunnerTelemetryStatus } from '../runner-telemetry'

describe('runner monitor telemetry', () => {
  it('defines read-only telemetry for each runtime monitor', () => {
    const telemetry = getRunnerTelemetryStatus()
    const nodeIds = telemetry.monitors.map((monitor) => monitor.nodeId)

    expect(telemetry.source).toBe('static_runner_monitor_telemetry')
    expect(telemetry.status).toBe('read_only_foundation')
    expect(telemetry.monitorCount).toBe(8)
    expect(telemetry.connectedMonitorCount).toBe(2)
    expect(telemetry.blockedMonitorCount).toBe(4)
    expect(telemetry.dispatchEnabled).toBe(false)
    expect(telemetry.liveRunnerEnabled).toBe(false)
    expect(telemetry.productionExecutionEnabled).toBe(false)
    expect(telemetry.browserAutomationEnabled).toBe(false)
    expect(telemetry.computerUseEnabled).toBe(false)
    expect(telemetry.noSharedCredentials).toBe(true)
    expect(telemetry.nextGate).toBe('connect_runner_heartbeat_events')
    expect(nodeIds).toEqual(expect.arrayContaining([
      'phill_main_cli_dashboard',
      'hermes_codex_orchestrator',
      'claude_max_builder_1',
      'claude_max_builder_2',
      'claude_max_builder_3',
      'minimax_media_agent',
      'obsidian_second_brain',
      'margot_board_senior_pm',
    ]))
  })

  it('requires evidence receipts before any runner can be trusted', () => {
    const telemetry = getRunnerTelemetryStatus()
    const hermes = telemetry.monitors.find((monitor) => monitor.nodeId === 'hermes_codex_orchestrator')
    const claude = telemetry.monitors.find((monitor) => monitor.nodeId === 'claude_max_builder_1')
    const minimax = telemetry.monitors.find((monitor) => monitor.nodeId === 'minimax_media_agent')
    const obsidian = telemetry.monitors.find((monitor) => monitor.nodeId === 'obsidian_second_brain')

    expect(hermes?.requiredEvidence).toEqual(expect.arrayContaining(['task_assignment', 'evidence_audit']))
    expect(claude?.requiredEvidence).toEqual(expect.arrayContaining(['diff_summary', 'tests_run', 'worktree_status']))
    expect(minimax?.requiredEvidence).toEqual(expect.arrayContaining(['asset_manifest', 'quota_snapshot']))
    expect(obsidian?.evidenceChannels).toEqual(expect.arrayContaining(['obsidian_source_note', 'second_brain_evidence_ledger']))
    expect(claude?.blockedReason).toContain('Operator install/login required')
  })
})
