import { describe, expect, it, vi } from 'vitest'
import { getCommandCentreOperatorSurfaceView } from '../command-centre'
import type { OperatorJobsView } from '../jobs'

const sandboxEmptyJobsView: OperatorJobsView = {
  source: 'sandbox_select',
  noApiKeyMode: true,
  liveExecution: false,
  jobCount: 0,
  jobs: [],
  note: 'Sandbox persistence connected; 0 jobs visible.',
}

describe('command centre operator execution surface view', () => {
  it('exposes all operator-session lanes without API-key mode or external execution', () => {
    const view = getCommandCentreOperatorSurfaceView()

    expect(view.surface).toBe('command_centre_operator_execution_surface')
    expect(view.founderOnly).toBe(true)
    expect(view.noApiKeyMode).toBe(true)
    expect(view.externalExecutionEnabled).toBe(false)
    expect(view.productionActionsGated).toBe(true)
    expect(view.jobSubmission.mode).toBe('disabled_safe_mock')
    expect(view.jobQueue.connected).toBe(false)
    expect(view.jobQueue.source).toBe('not_connected')

    const laneIds = view.lanes.map((lane) => lane.laneId)
    expect(laneIds).toEqual(expect.arrayContaining([
      'openai_codex_max',
      'claude_code_max_primary',
      'claude_code_max_secondary',
      'claude_code_max_tertiary',
      'minimax_cli',
      'cursor_cli',
      'hermes_local',
      'agentic_nexus_skill_exec',
    ]))
    expect(view.lanes.every((lane) => lane.apiKeyRequired === false)).toBe(true)
    expect(view.lanes.every((lane) => lane.externalActionAllowed === false)).toBe(true)
    expect(view.lanes.every((lane) => lane.productionActionAllowed === false)).toBe(true)
  })

  it('renders Senior PM queue, daily ops, blocked gates, and evidence pointers', () => {
    const view = getCommandCentreOperatorSurfaceView()

    expect(view.seniorPmQueue.items.length).toBeGreaterThanOrEqual(3)
    expect(view.seniorPmQueue.items[0].status).toMatch(/gate|blocked|ready|completed/)
    expect(view.dailyOps.source).toBe('local_dashboard_snapshot')
    expect(view.dailyOps.externalDispatchEnabled).toBe(false)
    expect(view.blockedGates).toEqual(expect.arrayContaining([
      expect.objectContaining({ gateId: 'approve_operator_gateway_sandbox_apply' }),
      expect.objectContaining({ gateId: 'install_claude_code_minimax_and_cursor_lanes' }),
      expect.objectContaining({ gateId: 'enable_external_operator_execution' }),
    ]))
    expect(view.evidencePointers.length).toBeGreaterThanOrEqual(4)
    expect(view.boardDecisionPanel.currentDecision).toBe('build_board_decision_mathematics_engine')
    expect(view.boardDecisionPanel.status).toBe('local_decision_engine_ready')
    expect(view.boardDecisionPanel.engine.nextRecommendedAction).toBe('act_now')
    expect(view.boardDecisionPanel.engine.nextRecommendedMoveId).toBe('product_factory_composer')
    expect(view.boardDecisionPanel.engine.hardGatesBypassed).toBe(0)
    expect(view.boardDecisionPanel.engine.candidateMovesScored).toBeGreaterThanOrEqual(7)
    expect(view.boardDecisionPanel.engine.coverageTarget).toBe(0.98)
    expect(view.projectCoverage.falseDonePreventionActive).toBe(true)
    expect(view.projectCoverage.projectsWithDodSpecs).toBeGreaterThanOrEqual(4)
    expect(view.projectCoverage.nextGeneratedJobs.length).toBeGreaterThan(0)
    expect(view.boardDecisionPanel.nextBoardGate).toContain('approve')
    expect(view.skillMesh.specializedSkillCount).toBeGreaterThanOrEqual(17)
    expect(view.skillMesh.businessMissionTemplateCount).toBeGreaterThanOrEqual(12)
    expect(view.skillMesh.blockedLanes).toContain('sandbox_voice_migration_blocked_op')
    expect(view.missionRouter.sampleRoute.actions.length).toBeGreaterThanOrEqual(15)
    expect(view.missionRouter.sampleRoute.actions.length).toBeLessThanOrEqual(20)
    expect(view.missionRouter.externalExecutionEnabled).toBe(false)
    expect(view.runtimeTopology.operatorDashboardNode).toBe('phill_main_cli_dashboard')
    expect(view.runtimeTopology.openGates).toContain('install_and_login_minimax_cli_or_mcp')
    expect(view.runnerTelemetry.source).toBe('static_runner_monitor_telemetry')
    expect(view.runnerTelemetry.telemetryEndpoint).toBe('/api/hermes/operator-gateway/runner-telemetry')
    expect(view.runnerTelemetry.dispatchEnabled).toBe(false)
    expect(view.runnerTelemetry.nextGate).toBe('connect_runner_heartbeat_events')
    expect(view.mobileVoiceIntake.source).toBe('static_mobile_voice_intake')
    expect(view.mobileVoiceIntake.endpoint).toBe('/api/hermes/operator-gateway/mobile-voice-intake')
    expect(view.mobileVoiceIntake.plaudSupported).toBe(true)
    expect(view.mobileVoiceIntake.secondBrainTarget).toBe('Obsidian/2nd-brain')
    expect(view.mobileVoiceIntake.packetPersistenceEnabled).toBe(true)
    expect(view.mobileVoiceIntake.sourceNoteWriteEnabled).toBe(true)
    expect(view.mobileVoiceIntake.boardPacketGenerationEnabled).toBe(true)
    expect(view.mobileVoiceIntake.openGates).toContain('approve_board_review_to_hermes_queue')
    expect(view.mobileVoiceIntake.openGates).not.toContain('write_obsidian_source_notes_from_packets')
    expect(view.mobileVoiceIntake.externalDispatchEnabled).toBe(false)
    expect(view.latestMobileVoiceCompoundMoves.source).toBe('mobile_voice_compound_moves_artifact_reader')
    expect(view.latestMobileVoiceCompoundMoves.project).toBe('mobile-voice-intake')
    expect(view.latestMobileVoiceCompoundMoves.hermesQueueEnabled).toBe(false)
    expect(view.latestMobileVoiceCompoundMoves.linearTaskCreated).toBe(false)
    expect(view.latestMobileVoiceCompoundMoves.externalDispatchEnabled).toBe(false)
    expect(view.latestMobileVoiceCompoundMoves.nextApprovalGate).toMatch(/generate_mobile_voice_next_20_artifact|approve_selected_next_20_moves/)
    expect(view.evidencePointers).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/api/hermes/operator-gateway/runner-telemetry' }),
      expect.objectContaining({ href: '/api/hermes/operator-gateway/mobile-voice-intake' }),
    ]))
  })

  it('keeps blocked-lane messaging honest for Max-plan operator sessions', () => {
    const view = getCommandCentreOperatorSurfaceView()
    const claude = view.lanes.find((lane) => lane.laneId === 'claude_code_max_primary')!
    const minimax = view.lanes.find((lane) => lane.laneId === 'minimax_cli')!
    const cursor = view.lanes.find((lane) => lane.laneId === 'cursor_cli')!
    const codex = view.lanes.find((lane) => lane.laneId === 'openai_codex_max')!

    expect(codex.visibleInCommandCentre).toBe(true)
    expect(codex.authMode).toBe('plan_session')
    expect(claude.visibleInCommandCentre).toBe(true)
    expect(claude.blockedReason).toContain('operator install/login')
    expect(minimax.visibleInCommandCentre).toBe(true)
    expect(minimax.blockedReason).toContain('operator install/login')
    expect(cursor.visibleInCommandCentre).toBe(true)
    expect(cursor.blockedReason).toContain('operator install/login')
  })
})



describe('command centre sandbox job creation state', () => {
  it('enables sandbox persistence-only creation when Board gate is approved', () => {
    const view = getCommandCentreOperatorSurfaceView({ jobsView: sandboxEmptyJobsView, sandboxJobCreationEnabled: true })

    expect(view.jobSubmission.mode).toBe('sandbox_persist_only')
    expect(view.jobSubmission.enabled).toBe(true)
    expect(view.jobSubmission.canPersist).toBe(true)
    expect(view.jobSubmission.canExecute).toBe(false)
    expect(view.jobSubmission.disabledReason).toContain('sandbox-only')
    expect(view.dryRunExecution.mode).toBe('sandbox_dry_run_only')
    expect(view.dryRunExecution.enabled).toBe(true)
    expect(view.dryRunExecution.canExecuteExternally).toBe(false)
    expect(view.dryRunExecution.liveRunnerEnabled).toBe(false)
    expect(view.dryRunExecution.productionConnected).toBe(false)
    expect(view.dryRunExecution.endpoint).toBe('/api/hermes/operator-gateway/jobs/dry-run')
    expect(view.blockedGates.map((gate) => gate.gateId)).toContain('approve_operator_gateway_sandbox_job_execution_dry_run')
    expect(view.boardDecisionPanel.nextBoardGate).toBe('approve_controlled_real_local_execution_dispatch_gate')
    expect(view.safetyStatus.externalExecutionEnabled).toBe(false)
  })

  it('surfaces controlled real-local execution foundation status without dispatch', () => {
    const view = getCommandCentreOperatorSurfaceView({ jobsView: sandboxEmptyJobsView, sandboxJobCreationEnabled: true })

    expect(view.controlledLocalExecution.mode).toBe('controlled_real_local_foundation')
    expect(view.controlledLocalExecution.status).toBe('local_foundation_ready')
    expect(view.controlledLocalExecution.endpoint).toBe('/api/hermes/operator-gateway/jobs/local-execution')
    expect(view.controlledLocalExecution.enabled).toBe(true)
    expect(view.controlledLocalExecution.dispatchEnabled).toBe(false)
    expect(view.controlledLocalExecution.externalExecutionEnabled).toBe(false)
    expect(view.controlledLocalExecution.liveRunnerEnabled).toBe(false)
    expect(view.controlledLocalExecution.productionConnected).toBe(false)
    expect(view.controlledLocalExecution.activeLanes).toEqual(['hermes_local', 'openai_codex_max', 'agentic_nexus_skill_exec'])
    expect(view.controlledLocalExecution.pendingLanes).toEqual([
      'claude_code_max_primary',
      'claude_code_max_secondary',
      'claude_code_max_tertiary',
      'minimax_cli',
      'cursor_cli',
    ])
  })

})
