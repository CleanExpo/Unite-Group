import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/margot/account-voice', () => ({
  getAccountVoice: vi.fn(),
  getStoredAccountVoice: vi.fn(),
  saveAccountVoice: vi.fn(),
  getAccountAgentEnabled: vi.fn(),
  setAccountAgentEnabled: vi.fn(),
  DEFAULT_FOUNDER_VOICE: {
    name: 'Phill',
    signOff: 'Cheers, Phill',
    toneGuidelines: ['default'],
    neverDo: ['default'],
  },
}))

import { getUser } from '@/lib/supabase/server'
import {
  getAccountVoice,
  getStoredAccountVoice,
  saveAccountVoice,
  getAccountAgentEnabled,
  setAccountAgentEnabled,
} from '@/lib/margot/account-voice'
import { GET, PUT } from '../route'

const url = 'http://localhost/api/settings/integrations/voice'

function putRequest(body: unknown) {
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET/PUT /api/settings/integrations/voice (task 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(new Request(`${url}?account_email=a@b.com`))
    expect(res.status).toBe(401)
    expect(getStoredAccountVoice).not.toHaveBeenCalled()
  })

  it('GET rejects a missing account_email', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await GET(new Request(url))
    expect(res.status).toBe(400)
    expect(getStoredAccountVoice).not.toHaveBeenCalled()
  })

  it('GET returns isCustom=false with the default when unset', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(getStoredAccountVoice).mockResolvedValue(null)
    const res = await GET(new Request(`${url}?account_email=a@b.com`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.isCustom).toBe(false)
    expect(body.voice.name).toBe('Phill')
    expect(getStoredAccountVoice).toHaveBeenCalledWith('founder-1', 'a@b.com')
  })

  it('GET returns isCustom=true with the stored voice when set', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(getStoredAccountVoice).mockResolvedValue({
      name: 'Custom',
      signOff: 'x',
      toneGuidelines: ['a'],
      neverDo: ['b'],
    })
    const res = await GET(new Request(`${url}?account_email=a@b.com`))
    const body = await res.json()
    expect(body.isCustom).toBe(true)
    expect(body.voice.name).toBe('Custom')
  })

  it('PUT returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await PUT(putRequest({ account_email: 'a@b.com' }))
    expect(res.status).toBe(401)
    expect(saveAccountVoice).not.toHaveBeenCalled()
  })

  it('PUT rejects a missing account_email', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await PUT(putRequest({ name: 'Phill' }))
    expect(res.status).toBe(400)
    expect(saveAccountVoice).not.toHaveBeenCalled()
  })

  it('PUT rejects invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await PUT(
      new Request(url, { method: 'PUT', body: 'not json' }),
    )
    expect(res.status).toBe(400)
  })

  it('PUT saves a validated, coerced voice for the account', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(saveAccountVoice).mockResolvedValue(undefined)
    vi.mocked(getAccountVoice).mockResolvedValue({
      name: 'Phill',
      signOff: 'Cheers, Phill',
      toneGuidelines: ['concise'],
      neverDo: [],
    })

    const res = await PUT(
      putRequest({
        account_email: 'a@b.com',
        name: 'Phill',
        signOff: 'Cheers, Phill',
        toneGuidelines: ['concise', '', '  '], // blanks stripped
        neverDo: 'not-an-array', // coerced to []
      }),
    )

    expect(res.status).toBe(200)
    expect(saveAccountVoice).toHaveBeenCalledWith('founder-1', 'a@b.com', {
      name: 'Phill',
      signOff: 'Cheers, Phill',
      toneGuidelines: ['concise'],
      neverDo: [],
    })
  })

  it('GET returns the per-account agentEnabled flag (Slice 2)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(getStoredAccountVoice).mockResolvedValue(null)
    vi.mocked(getAccountAgentEnabled).mockResolvedValue(true)
    const res = await GET(new Request(`${url}?account_email=a@b.com`))
    const body = await res.json()
    expect(body.agentEnabled).toBe(true)
    expect(getAccountAgentEnabled).toHaveBeenCalledWith('founder-1', 'a@b.com')
  })

  it('PUT toggles agent_enabled ONLY, without clobbering the voice', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(setAccountAgentEnabled).mockResolvedValue(undefined)
    vi.mocked(getAccountVoice).mockResolvedValue({
      name: 'Phill',
      signOff: 'Cheers, Phill',
      toneGuidelines: [],
      neverDo: [],
    })
    vi.mocked(getAccountAgentEnabled).mockResolvedValue(true)

    const res = await PUT(putRequest({ account_email: 'a@b.com', agent_enabled: true }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(setAccountAgentEnabled).toHaveBeenCalledWith('founder-1', 'a@b.com', true)
    // toggle carries no voice fields → voice must NOT be re-saved
    expect(saveAccountVoice).not.toHaveBeenCalled()
    expect(body.agentEnabled).toBe(true)
  })

  it('PUT with only a voice edit never flips the agent toggle', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(saveAccountVoice).mockResolvedValue(undefined)
    vi.mocked(getAccountVoice).mockResolvedValue({
      name: 'Phill',
      signOff: 'Cheers, Phill',
      toneGuidelines: [],
      neverDo: [],
    })
    vi.mocked(getAccountAgentEnabled).mockResolvedValue(false)

    const res = await PUT(putRequest({ account_email: 'a@b.com', name: 'Phill' }))
    expect(res.status).toBe(200)
    expect(saveAccountVoice).toHaveBeenCalled()
    expect(setAccountAgentEnabled).not.toHaveBeenCalled()
  })

  it('PUT requires authentication for the agent toggle', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await PUT(putRequest({ account_email: 'a@b.com', agent_enabled: true }))
    expect(res.status).toBe(401)
    expect(setAccountAgentEnabled).not.toHaveBeenCalled()
  })
})
