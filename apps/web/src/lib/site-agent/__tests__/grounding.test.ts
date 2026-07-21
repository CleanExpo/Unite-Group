import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ground, formatGroundingContext } from '../grounding'

// The UNI-2358 module `@/lib/rag/retrieve` does NOT exist on this branch, so
// grounding's dynamic import rejects for real here — these tests exercise the
// genuine fallback path, not a simulated one.

const mockMaybeSingle = vi.fn()
const businessesChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: mockMaybeSingle,
}
businessesChain.select.mockReturnValue(businessesChain)
businessesChain.eq.mockReturnValue(businessesChain)

const mockFrom = vi.fn((table: string) => {
  if (table === 'businesses') return businessesChain
  // Any read of internal tables (e.g. nexus_pages) is a bug: the public agent
  // must never touch them. Throw so a regression fails loudly.
  throw new Error(`grounding must not query "${table}" on the anonymous surface`)
})
const mockClient = { from: mockFrom } as any

describe('ground (rag module absent — public profile fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('grounds on the public business profile only, never internal pages', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-1', name: 'Synthex', description: 'Marketing automation for trades.' },
      error: null,
    })

    const result = await ground(mockClient, 'founder-1', 'synthex', 'what is your pricing?')

    expect(result.source).toBe('keyword')
    expect(result.businessName).toBe('Synthex')
    expect(result.snippets.length).toBe(1)
    expect(result.snippets[0].content).toContain('Marketing automation')
    expect(result.snippets[0].source).toBe('business_profile')
    // nexus_pages (or any non-businesses table) must never have been queried.
    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(mockFrom).not.toHaveBeenCalledWith('nexus_pages')
  })

  it('fails closed (source "none", no snippets) when the business key does not resolve', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await ground(mockClient, 'founder-1', 'ghost', 'anything at all?')
    expect(result.source).toBe('none')
    expect(result.snippets).toEqual([])
    expect(result.businessName).toBeNull()
    // Never falls through to any founder-wide table read.
    expect(mockFrom).not.toHaveBeenCalledWith('nexus_pages')
  })

  it('returns source "none" when the resolved business has no description', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-1', name: 'Synthex', description: null },
      error: null,
    })
    const result = await ground(mockClient, 'founder-1', 'synthex', 'hello?')
    expect(result.source).toBe('none')
    expect(result.snippets).toEqual([])
    expect(result.businessName).toBe('Synthex')
  })
})

describe('formatGroundingContext', () => {
  it('renders numbered snippets with sources', () => {
    const text = formatGroundingContext([
      { content: 'Alpha', source: 'Page A', similarity: 0.9 },
      { content: 'Beta', source: null, similarity: 0 },
    ])
    expect(text).toBe('[1] (Page A) Alpha\n[2] Beta')
  })
})
