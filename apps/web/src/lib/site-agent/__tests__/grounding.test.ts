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

let pagesResult: { data: unknown; error: unknown } = { data: [], error: null }
const pagesChain: Record<string, any> = {}
for (const method of ['select', 'eq', 'limit', 'or']) {
  pagesChain[method] = vi.fn().mockReturnValue(pagesChain)
}
// Thenable — awaiting the builder resolves the query, like supabase-js.
pagesChain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(pagesResult).then(resolve)

const mockFrom = vi.fn((table: string) => (table === 'businesses' ? businessesChain : pagesChain))
const mockClient = { from: mockFrom } as any

describe('ground (rag module absent — keyword fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pagesResult = { data: [], error: null }
  })

  it('falls back to nexus_pages keyword lookup scoped by business', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-1', name: 'Synthex', description: 'Marketing automation for trades.' },
      error: null,
    })
    pagesResult = {
      data: [
        {
          title: 'Pricing',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Plans start at $99/mo.' }] }] },
        },
      ],
      error: null,
    }

    const result = await ground(mockClient, 'founder-1', 'synthex', 'what is your pricing?')

    expect(result.source).toBe('keyword')
    expect(result.businessName).toBe('Synthex')
    // Business profile + matched page
    expect(result.snippets.length).toBe(2)
    expect(result.snippets[0].content).toContain('Marketing automation')
    expect(result.snippets[1].content).toContain('Plans start at $99/mo.')
    expect(result.snippets[1].source).toBe('Pricing')
    // Scoped by founder and resolved business id
    expect(pagesChain.eq).toHaveBeenCalledWith('founder_id', 'founder-1')
    expect(pagesChain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
    expect(pagesChain.or).toHaveBeenCalledWith(expect.stringContaining('title.ilike.%pricing%'))
  })

  it('returns source "none" when nothing is found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await ground(mockClient, 'founder-1', 'ghost', 'anything at all?')
    expect(result.source).toBe('none')
    expect(result.snippets).toEqual([])
    expect(result.businessName).toBeNull()
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
