import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted above all imports by Vitest transform) ────────────────────

vi.mock('@/lib/synthex/citation-tracker', () => ({ generateCitationReport: vi.fn() }))

// ── Static imports ──────────────────────────────────────────────────────────

import { generateCitationReport } from '@/lib/synthex/citation-tracker'
import { POST } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')

function req(body: unknown, auth: string | null = 'Bearer test-secret') {
  return new Request('https://app.test/api/synthex/citation-check', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const REPORT = {
  brandId: 'brand-1',
  period: '2026-06',
  checks: [],
  avgCitationScore: 0,
  topCitedKeywords: [],
  citationTrend: 'stable',
  generatedAt: '2026-06-23T00:00:00.000Z',
}

describe('POST /api/synthex/citation-check', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when the CRON_SECRET bearer token is wrong', async () => {
    const res = await POST(req({ brandId: 'b1', keywords: ['k'] }, 'Bearer nope'))
    expect(res.status).toBe(401)
    expect(generateCitationReport).not.toHaveBeenCalled()
  })

  it('returns 401 when the authorization header is absent', async () => {
    const res = await POST(req({ brandId: 'b1', keywords: ['k'] }, null))
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid JSON body', async () => {
    const res = await POST(req('{not json', 'Bearer test-secret'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/invalid json/i)
  })

  it('returns 400 when brandId is missing', async () => {
    const res = await POST(req({ keywords: ['k'] }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/brandId/i)
  })

  it('returns 400 when keywords is not a non-empty array', async () => {
    const res = await POST(req({ brandId: 'b1', keywords: [] }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/keywords/i)
  })

  it('returns 400 when a keyword is an empty string', async () => {
    const res = await POST(req({ brandId: 'b1', keywords: ['ok', '  '] }))
    expect(res.status).toBe(400)
    expect(generateCitationReport).not.toHaveBeenCalled()
  })

  it('returns 200 with the generated report on success (brandId trimmed)', async () => {
    vi.mocked(generateCitationReport).mockResolvedValue(REPORT as never)
    const res = await POST(req({ brandId: '  brand-1  ', keywords: ['gst returns'] }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as typeof REPORT
    expect(body.brandId).toBe('brand-1')
    expect(generateCitationReport).toHaveBeenCalledWith('brand-1', ['gst returns'])
  })

  it('returns 500 when report generation throws', async () => {
    vi.mocked(generateCitationReport).mockRejectedValue(new Error('perplexity down'))
    const res = await POST(req({ brandId: 'b1', keywords: ['k'] }))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string; detail: string }
    expect(body.error).toMatch(/generation failed/i)
    expect(body.detail).toBe('perplexity down')
  })
})
