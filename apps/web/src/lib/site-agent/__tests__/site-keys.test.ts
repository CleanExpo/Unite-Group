import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateSiteKey, generateSiteKey, SITE_KEY_PREFIX } from '../site-keys'

// ── Shared single mock (mirrors campaigns/drip route test style) ─────────────
const mockMaybeSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).maybeSingle = mockMaybeSingle
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()
const mockClient = { from: mockFrom } as any

const row = (overrides: object = {}) => ({
  founder_id: 'founder-1',
  business_key: 'synthex',
  allowed_origins: [],
  active: true,
  ...overrides,
})

describe('validateSiteKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
  })

  it('accepts an active key with an empty allow-list from any origin', async () => {
    mockMaybeSingle.mockResolvedValue({ data: row(), error: null })
    const result = await validateSiteKey(mockClient, 'sk_site_good', 'https://anything.example')
    expect(result).toEqual({ ok: true, founderId: 'founder-1', businessKey: 'synthex' })
    expect(mockFrom).toHaveBeenCalledWith('site_keys')
    expect(chain.eq).toHaveBeenCalledWith('publishable_key', 'sk_site_good')
  })

  it('accepts an allow-listed origin (normalised, case-insensitive, trailing slash)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: row({ allowed_origins: ['https://Client.Example/'] }),
      error: null,
    })
    const result = await validateSiteKey(mockClient, 'sk_site_good', 'https://client.example')
    expect(result.ok).toBe(true)
  })

  it('rejects an inactive key', async () => {
    mockMaybeSingle.mockResolvedValue({ data: row({ active: false }), error: null })
    const result = await validateSiteKey(mockClient, 'sk_site_good', 'https://client.example')
    expect(result).toEqual({ ok: false, reason: 'inactive_key' })
  })

  it('rejects an origin not on a non-empty allow-list', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: row({ allowed_origins: ['https://client.example'] }),
      error: null,
    })
    const result = await validateSiteKey(mockClient, 'sk_site_good', 'https://evil.example')
    expect(result).toEqual({ ok: false, reason: 'origin_not_allowed' })
  })

  it('rejects a missing origin when an allow-list is set', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: row({ allowed_origins: ['https://client.example'] }),
      error: null,
    })
    const result = await validateSiteKey(mockClient, 'sk_site_good', null)
    expect(result).toEqual({ ok: false, reason: 'origin_required' })
  })

  it('rejects an unknown key', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await validateSiteKey(mockClient, 'sk_site_missing', null)
    expect(result).toEqual({ ok: false, reason: 'unknown_key' })
  })

  it('rejects a malformed key without touching the database', async () => {
    const result = await validateSiteKey(mockClient, 'pk_live_wrong', null)
    expect(result).toEqual({ ok: false, reason: 'malformed_key' })
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('generateSiteKey', () => {
  it('generates unique keys with the sk_site_ prefix', () => {
    const a = generateSiteKey()
    const b = generateSiteKey()
    expect(a.startsWith(SITE_KEY_PREFIX)).toBe(true)
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(SITE_KEY_PREFIX.length + 20)
  })
})
