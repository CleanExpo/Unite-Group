import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({
  archiveThread: vi.fn(),
  deleteThread: vi.fn(),
  markAsRead: vi.fn(),
  markAsUnread: vi.fn(),
  sendReply: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { archiveThread, deleteThread, markAsRead, markAsUnread, sendReply } from '@/lib/integrations/google'
import { POST } from '../route'

const params = { params: Promise.resolve({ threadId: 't-1' }) }

function req(body: object) {
  return new Request('https://app.test/api/email/threads/t-1/action', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/email/threads/[threadId]/action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ account: 'a@b.com', action: 'archive' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 400 when account is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ action: 'archive' }), params)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'account required' })
  })

  it('archives a thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(archiveThread).mockResolvedValue(undefined)
    const res = await POST(req({ account: 'a@b.com', action: 'archive' }), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(archiveThread).toHaveBeenCalledWith('user-1', 'a@b.com', 't-1')
  })

  it('deletes a thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(deleteThread).mockResolvedValue(undefined)
    const res = await POST(req({ account: 'a@b.com', action: 'delete' }), params)
    expect(res.status).toBe(200)
    expect(markAsRead).not.toHaveBeenCalled()
  })

  it('marks thread as read', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(markAsRead).mockResolvedValue(undefined)
    const res = await POST(req({ account: 'a@b.com', action: 'read', messageId: 'm-1' }), params)
    expect(res.status).toBe(200)
    expect(markAsRead).toHaveBeenCalledWith('user-1', 'a@b.com', 'm-1')
  })

  it('marks thread as unread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(markAsUnread).mockResolvedValue(undefined)
    const res = await POST(req({ account: 'a@b.com', action: 'unread' }), params)
    expect(res.status).toBe(200)
  })

  it('returns 400 for reply missing required fields', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ account: 'a@b.com', action: 'reply', to: 'x@y.com' }), params)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'to, subject, body required for reply' })
  })

  it('sends a reply successfully', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(sendReply).mockResolvedValue({ messageId: 'msg-99' } as any)
    const res = await POST(
      req({ account: 'a@b.com', action: 'reply', to: 'x@y.com', subject: 'Re: Hi', body: 'Thanks!' }),
      params,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messageId).toBe('msg-99')
  })

  it('returns 400 for unknown action', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ account: 'a@b.com', action: 'hover' }), params)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown action/)
  })

  it('returns 500 when integration throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(archiveThread).mockRejectedValue(new Error('Gmail down'))
    const res = await POST(req({ account: 'a@b.com', action: 'archive' }), params)
    expect(res.status).toBe(500)
  })
})
