import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTalkingHeadVideo, getVideoStatus } from '../heygen'

describe('HeyGen v3 adapter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubEnv('HEYGEN_API_KEY', 'test-key')
  })

  it('creates a captioned v3 video with an idempotency key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { video_id: 'video-1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const id = await createTalkingHeadVideo({
      avatarId: 'avatar-1', script: 'Hello', aspectRatio: '9:16',
      idempotencyKey: 'campaign:1:fingerprint',
    })

    expect(id).toBe('video-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.heygen.com/v3/videos',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'campaign:1:fingerprint' }),
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toMatchObject({ type: 'avatar', avatar_id: 'avatar-1', script: 'Hello', output_format: 'mp4' })
  })

  it('loads v3 video status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'completed', video_url: 'https://cdn/video.mp4', thumbnail_url: null, duration: 12 } }),
    }))

    const status = await getVideoStatus('video-1')
    expect(status.status).toBe('completed')
    expect(status.videoUrl).toBe('https://cdn/video.mp4')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.heygen.com/v3/videos/video-1',
      expect.any(Object),
    )
  })
})
