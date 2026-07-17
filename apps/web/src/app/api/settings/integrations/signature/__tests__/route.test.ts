import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/email/signature', () => ({ getAccountSignature: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getAccountSignature } from '@/lib/email/signature'
import { GET } from '../route'

const url = 'http://localhost/api/settings/integrations/signature'
const BUSINESS = 'phill@disasterrecovery.com.au'
const PERSONAL = 'phill.mcgurk@gmail.com'

describe('GET /api/settings/integrations/signature (UNI-2153)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(new Request(`${url}?account=${encodeURIComponent(BUSINESS)}`))
    expect(res.status).toBe(401)
    expect(getAccountSignature).not.toHaveBeenCalled()
  })

  it('returns 400 when account is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await GET(new Request(url))
    expect(res.status).toBe(400)
    expect(getAccountSignature).not.toHaveBeenCalled()
  })

  it('returns { html } for a business account', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(getAccountSignature).mockResolvedValue('<table>SIG</table>')
    const res = await GET(new Request(`${url}?account=${encodeURIComponent(BUSINESS)}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.html).toBe('<table>SIG</table>')
    expect(getAccountSignature).toHaveBeenCalledWith('founder-1', BUSINESS, undefined)
  })

  it('passes a slogan override through to the generator', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(getAccountSignature).mockResolvedValue('<table>SIG</table>')
    await GET(new Request(`${url}?account=${encodeURIComponent(BUSINESS)}&slogan=Custom%20line`))
    expect(getAccountSignature).toHaveBeenCalledWith('founder-1', BUSINESS, { slogan: 'Custom line' })
  })

  it('returns { html: null } with a note for a personal account', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await GET(new Request(`${url}?account=${encodeURIComponent(PERSONAL)}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.html).toBeNull()
    expect(body.note).toMatch(/business accounts only/i)
    expect(getAccountSignature).not.toHaveBeenCalled()
  })
})
