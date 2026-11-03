import { describe, it, expect, vi, beforeEach } from 'vitest'

// UNI-3223: a failed vault read must not look like a missing credential.
const single = vi.fn()
vi.mock('@/lib/supabase/service', () => {
  const q: Record<string, unknown> = {}
  q.from = () => q
  q.select = () => q
  q.eq = () => q
  q.single = () => single()
  return { createServiceClient: () => q }
})
vi.mock('@/lib/vault', () => ({ decrypt: () => JSON.stringify({ access_token: 'a', expiry_date: Date.now() + 3_600_000 }) }))

import { getAccessTokenForEmail } from '../google-oauth'

beforeEach(() => single.mockReset())

describe('getAccessTokenForEmail vault read', () => {
  it('a database error throws "Google credentials read failed", not "No Google credentials found"', async () => {
    single.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection refused' } })
    await expect(getAccessTokenForEmail('f', 'contact@unite-group.in')).rejects.toThrow(/^Google credentials read failed: connection refused$/)
  })

  it('no matching row (PGRST116) still throws "No Google credentials found"', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } })
    await expect(getAccessTokenForEmail('f', 'contact@unite-group.in')).rejects.toThrow(/^No Google credentials found for contact@unite-group\.in$/)
  })
})
