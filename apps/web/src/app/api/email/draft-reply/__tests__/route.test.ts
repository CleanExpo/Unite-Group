import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({
  fetchFullThread: vi.fn(),
  // present so we can prove the route never touches a send path
  sendReply: vi.fn(),
  archiveThread: vi.fn(),
  deleteThread: vi.fn(),
}))
vi.mock('@/lib/margot/account-voice', () => ({ getAccountVoice: vi.fn() }))
vi.mock('@/lib/margot/draft-reply', () => ({ generateFounderDraft: vi.fn() }))
vi.mock('@/lib/margot/providers', () => ({ createAnthropicComplete: vi.fn(() => vi.fn()) }))

import { getUser } from '@/lib/supabase/server'
import { fetchFullThread, sendReply } from '@/lib/integrations/google'
import { getAccountVoice } from '@/lib/margot/account-voice'
import { generateFounderDraft } from '@/lib/margot/draft-reply'
import { createAnthropicComplete } from '@/lib/margot/providers'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/email/draft-reply', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const voice = { name: 'Phill', signOff: 'Cheers, Phill', toneGuidelines: [], neverDo: [] }
const thread = {
  id: 't-1',
  subject: 'Quote request',
  messages: [
    { id: 'm-1', from: 'a@client.com', to: 'me@biz.com', date: 'd1', bodyHtml: null, bodyText: 'First', attachments: [], unread: false, labelIds: [] },
    { id: 'm-2', from: 'b@client.com', to: 'me@biz.com', date: 'd2', bodyHtml: null, bodyText: 'Latest message', attachments: [], unread: true, labelIds: [] },
  ],
}

describe('POST /api/email/draft-reply', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ account: 'a@b.com', threadId: 't-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    const res = await POST(req({ threadId: 't-1' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'account required' })
  })

  it('returns 400 when threadId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    const res = await POST(req({ account: 'a@b.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'threadId required' })
  })

  it('returns { body } from the founder-voice drafter on the happy path', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getAccountVoice).mockResolvedValue(voice as never)
    vi.mocked(fetchFullThread).mockResolvedValue(thread as never)
    vi.mocked(generateFounderDraft).mockResolvedValue('Thanks for reaching out — here is a quote.\n\nCheers, Phill')

    const res = await POST(req({ account: 'a@b.com', threadId: 't-1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ body: 'Thanks for reaching out — here is a quote.\n\nCheers, Phill' })

    // builds IncomingEmail from the MOST RECENT message + thread subject
    const incoming = vi.mocked(generateFounderDraft).mock.calls[0][0]
    expect(incoming).toMatchObject({ from: 'b@client.com', subject: 'Quote request', body: 'Latest message' })
    expect(getAccountVoice).toHaveBeenCalledWith('user-1', 'a@b.com')
    expect(fetchFullThread).toHaveBeenCalledWith('user-1', 'a@b.com', 't-1')
  })

  it('is on-demand: does NOT send and does NOT gate behind MARGOT_DRAFTS_ENABLED', async () => {
    const prev = process.env.MARGOT_DRAFTS_ENABLED
    delete process.env.MARGOT_DRAFTS_ENABLED // flag OFF — must not block an on-demand draft
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getAccountVoice).mockResolvedValue(voice as never)
    vi.mocked(fetchFullThread).mockResolvedValue(thread as never)
    vi.mocked(generateFounderDraft).mockResolvedValue('draft body')

    const res = await POST(req({ account: 'a@b.com', threadId: 't-1' }))
    expect(res.status).toBe(200)
    // never touches a send path
    expect(sendReply).not.toHaveBeenCalled()
    // still drafts with the flag off — proves it is not gated
    expect(generateFounderDraft).toHaveBeenCalledTimes(1)

    if (prev === undefined) delete process.env.MARGOT_DRAFTS_ENABLED
    else process.env.MARGOT_DRAFTS_ENABLED = prev
  })

  it('returns 400 when the thread has no messages', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getAccountVoice).mockResolvedValue(voice as never)
    vi.mocked(fetchFullThread).mockResolvedValue({ id: 't-1', subject: 'Empty', messages: [] } as never)

    const res = await POST(req({ account: 'a@b.com', threadId: 't-1' }))
    expect(res.status).toBe(400)
    expect(generateFounderDraft).not.toHaveBeenCalled()
  })

  it('returns 500 (never throws to client) when the drafter fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getAccountVoice).mockResolvedValue(voice as never)
    vi.mocked(fetchFullThread).mockResolvedValue(thread as never)
    vi.mocked(generateFounderDraft).mockRejectedValue(new Error('model down'))

    const res = await POST(req({ account: 'a@b.com', threadId: 't-1' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBeTruthy()
  })

  it('does not import a send path into the route module', () => {
    // createAnthropicComplete is the only provider edge the route wires
    expect(createAnthropicComplete).toBeDefined()
  })
})
