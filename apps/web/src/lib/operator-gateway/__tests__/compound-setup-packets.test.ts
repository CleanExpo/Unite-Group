import { describe, expect, it } from 'vitest'
import { getCompoundSetupPackets, getCompoundSetupPacketStatus } from '../compound-setup-packets'

describe('compound setup packet registry', () => {
  it('loads setup packets for the priority project surfaces', async () => {
    const packets = await getCompoundSetupPackets()
    const projectNames = packets.map((packet) => packet.project_name)

    expect(projectNames).toEqual(expect.arrayContaining([
      'Unite-Group',
      'RestoreAssist',
      'Synthex',
      'ITR-Button',
      'Pi-CEO',
      '2nd-brain',
    ]))
    expect(packets).toHaveLength(6)
    expect(packets.every((packet) => packet.hard_gates.includes('operator_approval_before_install'))).toBe(true)
    expect(packets.every((packet) => packet.hard_gates.includes('no_external_execution'))).toBe(true)
    expect(packets.every((packet) => packet.blocked_install_commands.length >= 1)).toBe(true)
  })

  it('reports dashboard-ready status without install, API-key mode, or production actions', async () => {
    const status = await getCompoundSetupPacketStatus()

    expect(status.source).toBe('static_compound_setup_packet_registry')
    expect(status.packetCount).toBe(6)
    expect(status.readyCount).toBe(6)
    expect(status.p0Count).toBe(4)
    expect(status.sourceRefs).toEqual(expect.arrayContaining([
      'https://github.com/EveryInc/compound-engineering-plugin',
      'https://github.com/EveryInc/compound-knowledge-plugin',
    ]))
    expect(status.noAutoInstall).toBe(true)
    expect(status.noApiKeyMode).toBe(true)
    expect(status.externalExecutionEnabled).toBe(false)
    expect(status.productionDbTouched).toBe(false)
    expect(status.nextPacketId).toBe('ce-setup-unite-group')
  })
})
