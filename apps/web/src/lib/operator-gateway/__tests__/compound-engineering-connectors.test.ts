import { describe, expect, it } from 'vitest'
import {
  getCompoundEngineeringConnectors,
  getCompoundEngineeringConnectorStatus,
} from '../compound-engineering-connectors'

describe('compound engineering connector registry', () => {
  it('maps Compound Engineering into safe portfolio connector lanes', () => {
    const connectors = getCompoundEngineeringConnectors()

    expect(connectors).toHaveLength(6)
    expect(connectors.map((connector) => connector.connectorId)).toEqual(expect.arrayContaining([
      'ce_setup_auditor',
      'ce_serial_review_bridge',
      'ce_research_scout_bridge',
      'ce_design_studio_bridge',
      'ce_workflow_loop_bridge',
      'ck_knowledge_capture_bridge',
    ]))
    expect(connectors.every((connector) => connector.prohibitedUse.includes('api_key_mode'))).toBe(true)
    expect(connectors.every((connector) => connector.prohibitedUse.includes('automatic_plugin_install'))).toBe(true)
    expect(connectors.every((connector) => connector.evidenceRequired.includes('2nd_brain_note'))).toBe(true)
  })

  it('reports a dashboard-ready status without auto-install or external execution', () => {
    const status = getCompoundEngineeringConnectorStatus()

    expect(status.source).toBe('static_compound_engineering_connector_registry')
    expect(status.status).toBe('local_connector_design_ready')
    expect(status.upstream.pluginRepo).toBe('EveryInc/compound-engineering-plugin')
    expect(status.upstream.observedCapabilities).toMatchObject({
      skills: 37,
      agents: 51,
      codexRequiresBunAgentInstall: true,
    })
    expect(status.portfolioTargets).toEqual(expect.arrayContaining([
      'Unite-Group',
      'RestoreAssist',
      'Synthex',
      'Pi-CEO',
      '2nd-brain',
    ]))
    expect(status.readyConnectors).toBeGreaterThanOrEqual(4)
    expect(status.noApiKeyMode).toBe(true)
    expect(status.autoInstallEnabled).toBe(false)
    expect(status.externalExecutionEnabled).toBe(false)
    expect(status.productionDbTouched).toBe(false)
  })
})
