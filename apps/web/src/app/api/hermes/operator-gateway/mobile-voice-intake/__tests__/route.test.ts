import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}))

import { createClient, getUser } from '@/lib/supabase/server'
import { GET, POST } from '../route'

const mockCreateClient = vi.mocked(createClient)
const mockGetUser = vi.mocked(getUser)

function request(body: unknown) {
  return new Request('https://example.test/api/hermes/operator-gateway/mobile-voice-intake', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('/api/hermes/operator-gateway/mobile-voice-intake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockPacketStore() {
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
            created_at: '2026-06-17T02:00:00.000Z',
            updated_at: '2026-06-17T02:00:00.000Z',
          },
          error: null,
        })),
      })),
    }))

    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ insert })),
    } as never)

    return insert
  }

  it('guards GET by founder/session', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
  })

  it('returns mobile voice intake status without enabling dispatch', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.source).toBe('static_mobile_voice_intake')
    expect(json.founderOnly).toBe(true)
    expect(json.plaudSupported).toBe(true)
    expect(json.externalDispatchEnabled).toBe(false)
    expect(json.autoPublishEnabled).toBe(false)
    expect(json.productionExecutionEnabled).toBe(false)
  })

  it('builds and persists a packet from a Plaud transcript without creating tasks', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    const insert = mockPacketStore()

    const res = await POST(request({
      source: 'plaud_zapier_export',
      title: 'Audio book idea',
      transcript: 'Capture this into the 2nd brain and research adjacent implementation paths.',
      summary: 'Mobile capture',
      speakerLabelsIncluded: false,
      timestampsIncluded: false,
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.persisted).toBe(true)
    expect(json.tasksCreated).toBe(false)
    expect(json.externalDispatchEnabled).toBe(false)
    expect(json.packet.source).toBe('plaud_zapier_export')
    expect(json.packet.obsidianTargetPath).toContain('2nd-brain/Mobile Voice Captures/')
    expect(json.packet.boardGate).toBe('mobile_voice_capture_review')
    expect(json.record.id).toBe('mobile-voice-row-1')
    expect(json.record.founderId).toBe('founder-1')
    expect(json.record.packetId).toBe(json.packet.packetId)
    expect(json.record.rawAudioStored).toBe(false)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      founder_id: 'founder-1',
      source: 'plaud_zapier_export',
      status: 'captured_for_review',
      board_gate: 'mobile_voice_capture_review',
      external_dispatch_enabled: false,
      auto_publish_enabled: false,
      production_execution_enabled: false,
      raw_audio_stored: false,
    }))
  })

  it('rejects invalid mobile voice packets safely', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const missingTranscript = await POST(request({ source: 'plaud_dev_api_webhook' }))
    expect(missingTranscript.status).toBe(400)
    expect(await missingTranscript.json()).toEqual({ error: 'transcript is required' })

    const unsupported = await POST(request({ source: 'unknown', transcript: 'hello' }))
    expect(unsupported.status).toBe(400)
    expect(await unsupported.json()).toEqual({ error: 'unsupported mobile voice source' })
  })
})
