import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { GET, POST } from '../route'

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

  it('builds a packet from a Plaud transcript without persisting or creating tasks', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const res = await POST(request({
      source: 'plaud_zapier_export',
      title: 'Audio book idea',
      transcript: 'Capture this into the 2nd brain and research adjacent implementation paths.',
      summary: 'Mobile capture',
      speakerLabelsIncluded: false,
      timestampsIncluded: false,
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.persisted).toBe(false)
    expect(json.tasksCreated).toBe(false)
    expect(json.externalDispatchEnabled).toBe(false)
    expect(json.packet.source).toBe('plaud_zapier_export')
    expect(json.packet.obsidianTargetPath).toContain('2nd-brain/Mobile Voice Captures/')
    expect(json.packet.boardGate).toBe('mobile_voice_capture_review')
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
