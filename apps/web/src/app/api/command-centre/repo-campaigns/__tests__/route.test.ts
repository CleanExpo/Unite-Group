import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted above all imports by Vitest transform) ────────────────────

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/registry', () => ({ getProjects: vi.fn() }))
vi.mock('@/lib/command-centre/repo-campaigns', () => ({ buildRepoCampaigns: vi.fn() }))
vi.mock('@/lib/command-centre/repo-campaigns-github', () => ({ makeGithubRepoFetcher: vi.fn(() => vi.fn()) }))

// ── Static imports ──────────────────────────────────────────────────────────

import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { buildRepoCampaigns } from '@/lib/command-centre/repo-campaigns'
import { GET } from '../route'

describe('GET /api/command-centre/repo-campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getProjects).mockResolvedValue([] as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
    expect(buildRepoCampaigns).not.toHaveBeenCalled()
  })

  it('returns 200 with the campaigns payload on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const payload = {
      source: 'cc:repo-campaigns',
      generatedAt: '2026-06-23T00:00:00.000Z',
      githubConnected: false,
      summary: { total: 0, activeCampaigns: 0, building: 0, idle: 0, planned: 0, notConnected: 0 },
      campaigns: [],
    }
    vi.mocked(buildRepoCampaigns).mockResolvedValue(payload as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as typeof payload
    expect(body.source).toBe('cc:repo-campaigns')
    expect(body.githubConnected).toBe(false)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(buildRepoCampaigns).toHaveBeenCalledOnce()
  })

  it('returns 500 when building the payload throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(buildRepoCampaigns).mockRejectedValue(new Error('registry exploded'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('repo-campaigns failed') // sanitised — raw error not leaked
    expect(body.error).not.toContain('registry exploded')
  })
})
