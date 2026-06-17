import { describe, expect, it, vi } from 'vitest'
import { buildMobileVoiceCapturePacket } from '../mobile-voice-intake'
import { persistMobileVoicePacket, type MobileVoicePacketWriteClient } from '../mobile-voice-packets'

function packet() {
  return buildMobileVoiceCapturePacket({
    source: 'mobile_voice_note',
    title: 'Driving idea',
    transcript: 'Turn the mobile note into a research-backed second brain capture before creating tasks.',
    summary: 'Capture idea',
    capturedAt: '2026-06-17T02:00:00.000Z',
  })
}

function storeClient(rowOverride: Record<string, unknown> = {}) {
  const insert = vi.fn((payload) => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({
        data: {
          id: 'mobile-voice-row-1',
          founder_id: payload.founder_id,
          packet_id: payload.packet_id,
          source: payload.source,
          title: payload.title,
          status: payload.status,
          transcript: payload.transcript,
          summary: payload.summary,
          captured_at_text: payload.captured_at_text,
          transcript_character_count: payload.transcript_character_count,
          speaker_labels_included: payload.speaker_labels_included,
          timestamps_included: payload.timestamps_included,
          source_url: payload.source_url,
          obsidian_target_path: payload.obsidian_target_path,
          second_brain_tags: payload.second_brain_tags,
          research_prompt: payload.research_prompt,
          senior_pm_work_candidates: payload.senior_pm_work_candidates,
          board_gate: payload.board_gate,
          external_dispatch_enabled: payload.external_dispatch_enabled,
          auto_publish_enabled: payload.auto_publish_enabled,
          production_execution_enabled: payload.production_execution_enabled,
          raw_audio_stored: payload.raw_audio_stored,
          created_at: '2026-06-17T02:01:00.000Z',
          updated_at: '2026-06-17T02:01:00.000Z',
          ...rowOverride,
        },
        error: null,
      })),
    })),
  }))

  const client: MobileVoicePacketWriteClient = {
    from: vi.fn(() => ({ insert })),
  }

  return { client, insert }
}

describe('mobile voice packet persistence', () => {
  it('stores founder-scoped review packets with execution disabled', async () => {
    const capturePacket = packet()
    const { client, insert } = storeClient()

    const result = await persistMobileVoicePacket({
      founderId: 'founder-1',
      client,
      packet: capturePacket,
      transcript: '  Turn the mobile note into a research-backed second brain capture before creating tasks.  ',
      summary: '  Capture idea  ',
      sourceUrl: '  https://example.test/plaud-note  ',
    })

    expect(result.ok).toBe(true)
    expect(result.persisted).toBe(true)
    expect(result.tasksCreated).toBe(false)
    expect(result.externalDispatchEnabled).toBe(false)
    expect(result.autoPublishEnabled).toBe(false)
    expect(result.productionExecutionEnabled).toBe(false)
    if (result.ok) {
      expect(result.record.founderId).toBe('founder-1')
      expect(result.record.packetId).toBe(capturePacket.packetId)
      expect(result.record.rawAudioStored).toBe(false)
      expect(result.record.sourceUrl).toBe('https://example.test/plaud-note')
    }
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      founder_id: 'founder-1',
      packet_id: capturePacket.packetId,
      transcript: 'Turn the mobile note into a research-backed second brain capture before creating tasks.',
      summary: 'Capture idea',
      source_url: 'https://example.test/plaud-note',
      external_dispatch_enabled: false,
      auto_publish_enabled: false,
      production_execution_enabled: false,
      raw_audio_stored: false,
    }))
  })

  it('rejects persistence without a founder, transcript, or write client', async () => {
    const capturePacket = packet()

    await expect(persistMobileVoicePacket({
      client: storeClient().client,
      packet: capturePacket,
      transcript: 'valid transcript',
    })).resolves.toMatchObject({ ok: false, status: 400, source: 'validation_failed' })

    await expect(persistMobileVoicePacket({
      founderId: 'founder-1',
      client: storeClient().client,
      packet: capturePacket,
      transcript: '   ',
    })).resolves.toMatchObject({ ok: false, status: 400, source: 'validation_failed' })

    await expect(persistMobileVoicePacket({
      founderId: 'founder-1',
      client: null,
      packet: capturePacket,
      transcript: 'valid transcript',
    })).resolves.toMatchObject({ ok: false, status: 503, source: 'not_connected' })
  })

  it('rejects any inserted row that comes back with execution enabled', async () => {
    const result = await persistMobileVoicePacket({
      founderId: 'founder-1',
      client: storeClient({ external_dispatch_enabled: true }).client,
      packet: packet(),
      transcript: 'valid transcript',
    })

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      source: 'mobile_voice_packet_insert_failed',
      persisted: false,
      tasksCreated: false,
      externalDispatchEnabled: false,
    })
  })
})
