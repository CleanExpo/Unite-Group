import { describe, expect, it } from 'vitest'
import { getRuntimeTopologyStatus } from '../runtime-topology'

describe('multi-CLI runtime topology', () => {
  it('models the single operator dashboard with isolated runner monitors', () => {
    const topology = getRuntimeTopologyStatus()
    const nodeIds = topology.nodes.map((node) => node.nodeId)

    expect(topology.source).toBe('static_multi_cli_runtime_topology')
    expect(topology.operatorDashboardNode).toBe('phill_main_cli_dashboard')
    expect(topology.noSharedCredentials).toBe(true)
    expect(topology.browserAutomationRequiresMainOperator).toBe(true)
    expect(topology.productionExecutionEnabled).toBe(false)
    expect(topology.obsidianMemoryMode).toBe('research_capture_and_learning_substrate')
    expect(nodeIds).toEqual(expect.arrayContaining([
      'hermes_codex_orchestrator',
      'claude_max_builder_1',
      'claude_max_builder_2',
      'claude_max_builder_3',
      'minimax_media_agent',
      'obsidian_second_brain',
      'margot_board_senior_pm',
    ]))
  })

  it('keeps all worker nodes reporting back to Hermes or the main dashboard', () => {
    const topology = getRuntimeTopologyStatus()
    const workerNodes = topology.nodes.filter((node) => node.nodeId !== topology.operatorDashboardNode)

    expect(workerNodes.every((node) => node.reportsTo !== null)).toBe(true)
    expect(topology.openGates).toEqual(expect.arrayContaining([
      'install_and_login_claude_max_builder_1',
      'install_and_login_claude_max_builder_2',
      'install_and_login_claude_max_builder_3',
      'install_and_login_minimax_cli_or_mcp',
      'wire_obsidian_research_capture_to_source_sync',
    ]))
    expect(topology.dataFlow.some((step) => step.includes('Obsidian/2nd-brain'))).toBe(true)
    expect(topology.gstackEnabled).toBe(true)
    expect(topology.compoundEngineeringEnabled).toBe(true)
  })
})
