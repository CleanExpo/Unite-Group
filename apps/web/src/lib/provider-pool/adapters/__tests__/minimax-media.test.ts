import { describe, it, expect, vi } from 'vitest'
import { makeMiniMaxMediaClient, type MediaRequest } from '../minimax-media'

const videoReq: MediaRequest = { kind: 'video', prompt: 'A drone shot of Brisbane', model: 'video-01' }

describe('makeMiniMaxMediaClient — not configured', () => {
  it('createTask returns not_configured WITHOUT calling fetch', async () => {
    const fetchFn = vi.fn()
    const client = makeMiniMaxMediaClient({ apiKey: undefined, fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.createTask(videoReq)
    expect(r).toEqual({ ok: false, reason: 'not_configured' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('pollTask returns not_configured WITHOUT calling fetch', async () => {
    const fetchFn = vi.fn()
    const client = makeMiniMaxMediaClient({ apiKey: undefined, fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.pollTask('task-1')
    expect(r).toEqual({ ok: false, reason: 'not_configured' })
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('makeMiniMaxMediaClient — create → poll happy path', () => {
  it('creates a task then polls it to success with a file URL', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes('/v1/video_generation')) {
        return { ok: true, status: 200, json: async () => ({ task_id: 'task-42' }) } as Response
      }
      // Poll endpoint
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'Success', file_url: 'https://cdn.minimax.io/out.mp4' }),
      } as Response
    })

    const client = makeMiniMaxMediaClient({
      apiKey: 'mm-key',
      fetchFn: fetchFn as unknown as typeof fetch,
    })

    const created = await client.createTask({ ...videoReq, groupId: 'grp-1' })
    expect(created).toEqual({ ok: true, taskId: 'task-42' })

    const status = await client.pollTask('task-42', 'grp-1')
    expect(status).toEqual({ ok: true, status: 'success', fileUrl: 'https://cdn.minimax.io/out.mp4' })

    // Default baseUrl + kind-specific path + Bearer auth + GroupId query param.
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.minimax.io/v1/video_generation?GroupId=grp-1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer mm-key' }),
      }),
    )
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.minimax.io/v1/query/generation?task_id=task-42&GroupId=grp-1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('routes voice and music to their own create paths', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ task_id: 't' }) }) as Response)
    const client = makeMiniMaxMediaClient({ apiKey: 'mm-key', fetchFn: fetchFn as unknown as typeof fetch })

    await client.createTask({ kind: 'voice', prompt: 'g\'day', model: 'speech-01' })
    await client.createTask({ kind: 'music', prompt: 'an upbeat jingle', model: 'music-01' })

    expect(fetchFn.mock.calls[0]![0]).toBe('https://api.minimax.io/v1/t2a_v2')
    expect(fetchFn.mock.calls[1]![0]).toBe('https://api.minimax.io/v1/music_generation')
  })
})

describe('makeMiniMaxMediaClient — failed + error states', () => {
  it('maps a failed provider status', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'Fail' }),
    }) as Response)
    const client = makeMiniMaxMediaClient({ apiKey: 'mm-key', fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.pollTask('task-1')
    expect(r).toEqual({ ok: true, status: 'failed', fileUrl: null })
  })

  it('maps an unknown/queued status with no file URL', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'Queueing' }),
    }) as Response)
    const client = makeMiniMaxMediaClient({ apiKey: 'mm-key', fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.pollTask('task-1')
    expect(r).toEqual({ ok: true, status: 'queued', fileUrl: null })
  })

  it('createTask maps non-2xx to error', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response)
    const client = makeMiniMaxMediaClient({ apiKey: 'mm-key', fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.createTask(videoReq)
    expect(r).toEqual({ ok: false, reason: 'error', detail: 'HTTP 500' })
  })

  it('createTask errors when task_id is missing', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response)
    const client = makeMiniMaxMediaClient({ apiKey: 'mm-key', fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.createTask(videoReq)
    expect(r).toEqual({ ok: false, reason: 'error', detail: 'no task_id in response' })
  })

  it('pollTask catches a network throw and never throws', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    const client = makeMiniMaxMediaClient({ apiKey: 'mm-key', fetchFn: fetchFn as unknown as typeof fetch })
    const r = await client.pollTask('task-1')
    expect(r).toEqual({ ok: false, reason: 'error', detail: 'ECONNRESET' })
  })
})
