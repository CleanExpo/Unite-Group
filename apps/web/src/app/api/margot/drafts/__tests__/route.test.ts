import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/margot/draft-reply', () => ({ generateFounderDraft: vi.fn() }))
vi.mock('@/lib/margot/providers', () => ({ createAnthropicComplete: vi.fn(() => 'complete-fn') }))
vi.mock('@/lib/margot/draft-store', () => ({ createMargotDraftStore: vi.fn() }))
vi.mock('@/lib/margot/account-voice', () => ({ getAccountVoice: vi.fn() }))
vi.mock('@/lib/email/signature', () => ({ getAccountSignature: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { generateFounderDraft } from '@/lib/margot/draft-reply'
import { createMargotDraftStore } from '@/lib/margot/draft-store'
import { getAccountVoice } from '@/lib/margot/account-voice'
import { getAccountSignature } from '@/lib/email/signature'
import { POST } from '../route'

const url = 'http://localhost/api/margot/drafts'
const BUSINESS = 'phill@disasterrecovery.com.au'
const PERSONAL = 'phill.mcgurk@gmail.com'

function post(body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

const createDraft = vi.fn()

describe('POST /api/margot/drafts — signature append (UNI-2153)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MARGOT_DRAFTS_ENABLED = 'true'
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(generateFounderDraft).mockResolvedValue('DRAFT BODY')
    vi.mocked(getAccountVoice).mockResolvedValue({
      name: 'Phill',
      signOff: 'Cheers, Phill',
      toneGuidelines: [],
      neverDo: [],
    })
    createDraft.mockResolvedValue('draft-1')
    vi.mocked(createMargotDraftStore).mockReturnValue({ createDraft } as never)
  })

  afterEach(() => {
    delete process.env.MARGOT_DRAFTS_ENABLED
  })

  it('business account: returned body ends with the signature', async () => {
    vi.mocked(getAccountSignature).mockResolvedValue('SIGNATURE')
    const res = await POST(
      post({ incoming: { body: 'hi', subject: 's' }, accountEmail: BUSINESS }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.body).toBe('DRAFT BODY\n\nSIGNATURE')
    expect(body.body.endsWith('SIGNATURE')).toBe(true)
    expect(getAccountSignature).toHaveBeenCalledWith('founder-1', BUSINESS)
    // The stored draft carries the combined body too.
    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'DRAFT BODY\n\nSIGNATURE' }),
    )
  })

  it('personal account: body unchanged, no footer appended', async () => {
    const res = await POST(
      post({ incoming: { body: 'hi', subject: 's' }, accountEmail: PERSONAL }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.body).toBe('DRAFT BODY')
    expect(getAccountSignature).not.toHaveBeenCalled()
    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'DRAFT BODY' }),
    )
  })
})
