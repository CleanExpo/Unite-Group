import { describe, expect, it } from 'vitest'
import { buildMobileVoiceCapturePacket, getMobileVoiceIntakeStatus } from '../mobile-voice-intake'

describe('mobile voice intake', () => {
  it('models Plaud/mobile capture as a gated second-brain intake', () => {
    const status = getMobileVoiceIntakeStatus()

    expect(status.source).toBe('static_mobile_voice_intake')
    expect(status.mobileFirst).toBe(true)
    expect(status.plaudSupported).toBe(true)
    expect(status.endpoint).toBe('/api/hermes/operator-gateway/mobile-voice-intake')
    expect(status.secondBrainTarget).toBe('Obsidian/2nd-brain')
    expect(status.researchExpansionEnabled).toBe(true)
    expect(status.packetPersistenceEnabled).toBe(true)
    expect(status.sourceNoteWriteEnabled).toBe(true)
    expect(status.boardPacketGenerationEnabled).toBe(true)
    expect(status.boardReviewRequired).toBe(true)
    expect(status.hermesQueueRequired).toBe(true)
    expect(status.externalDispatchEnabled).toBe(false)
    expect(status.autoPublishEnabled).toBe(false)
    expect(status.productionExecutionEnabled).toBe(false)
    expect(status.noSharedCredentials).toBe(true)
    expect(status.noRawAudioStorage).toBe(true)
    expect(status.plaudIngressModes).toEqual(expect.arrayContaining([
      'plaud_dev_api_webhook',
      'plaud_zapier_export',
      'plaud_manual_mobile_export',
      'mobile_voice_note',
    ]))
    expect(status.openGates).toContain('connect_obsidian_mobile_capture_folder')
    expect(status.openGates).toContain('approve_board_review_to_hermes_queue')
    expect(status.openGates).not.toContain('write_obsidian_source_notes_from_packets')
    expect(status.openGates).not.toContain('enable_board_review_to_hermes_queue')
    expect(status.openGates).not.toContain('persist_mobile_voice_packets')
    expect(status.nextAction).toContain('Approve Board-reviewed packets')
  })

  it('builds an Obsidian/research/Board packet without creating tasks', () => {
    const packet = buildMobileVoiceCapturePacket({
      source: 'plaud_dev_api_webhook',
      title: 'Podcast insight about restoration claims',
      transcript: 'Speaker 1: We should turn field conversations into RestoreAssist training and claim triage ideas.',
      summary: 'RestoreAssist mobile idea',
      capturedAt: '2026-06-17T01:00:00.000Z',
      speakerLabelsIncluded: true,
      timestampsIncluded: true,
    })

    expect(packet.packetId).toContain('mobile_voice_')
    expect(packet.status).toBe('captured_for_review')
    expect(packet.obsidianTargetPath).toContain('2nd-brain/Mobile Voice Captures/')
    expect(packet.secondBrainTags).toEqual(expect.arrayContaining(['mobile-capture', 'plaud', 'research-seed']))
    expect(packet.researchPrompt).toContain('Research and expand this mobile voice idea')
    expect(packet.researchPrompt).toContain('RestoreAssist mobile idea')
    expect(packet.seniorPmWorkCandidates).toEqual(expect.arrayContaining([
      'Run research expansion against GitHub, Hugging Face, web sources, and existing 2nd brain notes.',
      'Create Hermes Kanban or Linear tasks only after Board approval.',
    ]))
    expect(packet.boardGate).toBe('mobile_voice_capture_review')
    expect(packet.externalDispatchEnabled).toBe(false)
    expect(packet.autoPublishEnabled).toBe(false)
    expect(packet.productionExecutionEnabled).toBe(false)
  })
})
