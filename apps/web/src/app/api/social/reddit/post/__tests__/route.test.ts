import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/reddit', () => ({
  submitTextPost: vi.fn(),
  submitLinkPost: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { submitTextPost, submitLinkPost } from '@/lib/integrations/reddit'
import { POST } from '../route'

function req(body: object) {
  return new NextRequest('https://app.test/api/social/reddit/post', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/social/reddit/post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(submitTextPost).mockResolvedValue({ id: 'post-1', url: 'https://reddit.com/r/test/...' } as any)
    vi.mocked(submitLinkPost).mockResolvedValue({ id: 'post-2', url: 'https://reddit.com/r/test/...' } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ subreddit: 'test', title: 'T', businessKey: 'biz' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ title: 'T' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when neither body nor url provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ subreddit: 'test', title: 'T', businessKey: 'biz' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('body')
  })

  it('returns 200 on text post success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ subreddit: 'test', title: 'T', body: 'Hello reddit', businessKey: 'biz' }))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.success).toBe(true)
    expect(submitTextPost).toHaveBeenCalledWith('test', 'T', 'Hello reddit')
  })

  it('returns 200 on link post success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ subreddit: 'test', title: 'T', url: 'https://example.com', businessKey: 'biz' }))
    expect(res.status).toBe(200)
    expect(submitLinkPost).toHaveBeenCalledWith('test', 'T', 'https://example.com')
  })

  it('returns 502 when submission fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(submitTextPost).mockRejectedValue(new Error('Reddit error'))
    const res = await POST(req({ subreddit: 'test', title: 'T', body: 'text', businessKey: 'biz' }))
    expect(res.status).toBe(502)
  })
})
