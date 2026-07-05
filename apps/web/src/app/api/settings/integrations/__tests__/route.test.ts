import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/integrations/google-oauth', () => ({
  isGoogleConfigured: vi.fn(),
  getConnectedGoogleAccountsWithScopeStatus: vi.fn(),
}))

vi.mock('@/lib/integrations/microsoft-oauth', () => ({
  isMicrosoftConfigured: vi.fn(),
  getConnectedMicrosoftAccounts: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { isGoogleConfigured, getConnectedGoogleAccountsWithScopeStatus } from '@/lib/integrations/google-oauth'
import { isMicrosoftConfigured, getConnectedMicrosoftAccounts } from '@/lib/integrations/microsoft-oauth'
import { GET } from '../route'

describe('GET /api/settings/integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(getConnectedGoogleAccountsWithScopeStatus).not.toHaveBeenCalled()
    expect(getConnectedMicrosoftAccounts).not.toHaveBeenCalled()
  })

  it('lists connected Google accounts when configured, and skips the account lookup entirely when not', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(isGoogleConfigured).mockReturnValue(true)
    vi.mocked(isMicrosoftConfigured).mockReturnValue(false)
    vi.mocked(getConnectedGoogleAccountsWithScopeStatus).mockResolvedValue([
      { email: 'phill@disasterrecovery.com.au', businessKey: 'dr', label: 'DR Gmail', needsReauth: false },
    ])

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.google).toEqual({
      configured: true,
      accounts: [{ email: 'phill@disasterrecovery.com.au', businessKey: 'dr', label: 'DR Gmail', needsReauth: false }],
    })
    expect(body.microsoft).toEqual({ configured: false, accounts: [] })
    expect(getConnectedGoogleAccountsWithScopeStatus).toHaveBeenCalledWith('founder-1')
    expect(getConnectedMicrosoftAccounts).not.toHaveBeenCalled()
  })

  it('lists connected Microsoft accounts when configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(isGoogleConfigured).mockReturnValue(false)
    vi.mocked(isMicrosoftConfigured).mockReturnValue(true)
    vi.mocked(getConnectedMicrosoftAccounts).mockResolvedValue([
      { email: 'phill@unite-group.in', businessKey: 'personal', label: 'Outlook' },
    ])

    const res = await GET()
    const body = await res.json()

    expect(body.microsoft).toEqual({
      configured: true,
      accounts: [{ email: 'phill@unite-group.in', businessKey: 'personal', label: 'Outlook' }],
    })
    expect(body.google).toEqual({ configured: false, accounts: [] })
    expect(getConnectedMicrosoftAccounts).toHaveBeenCalledWith('founder-1')
  })
})
