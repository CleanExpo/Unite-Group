// src/app/api/nexus/prs/__tests__/route.test.ts
// Regression coverage for GET /api/nexus/prs — the Nexus pending-PR list.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/nexus/github-prs', () => ({
  fetchNexusPendingPRs: vi.fn(),
  isNexusGitHubConfigured: vi.fn(),
  getNexusRepos: vi.fn(),
}))
vi.mock('@/lib/nexus/pr-summariser', () => ({ summarisePRs: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import {
  fetchNexusPendingPRs,
  isNexusGitHubConfigured,
  getNexusRepos,
} from '@/lib/nexus/github-prs'
import { summarisePRs } from '@/lib/nexus/pr-summariser'
import { GET } from '../route'

describe('GET /api/nexus/prs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: configured with one repo (success-path defaults)
    vi.mocked(isNexusGitHubConfigured).mockReturnValue(true)
    vi.mocked(getNexusRepos).mockReturnValue([{ owner: 'CleanExpo', repo: 'Unite-Group' }])
  })

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('returns not_configured (200) when GitHub token is absent', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(isNexusGitHubConfigured).mockReturnValue(false)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; prs: unknown[]; repos: unknown[] }
    expect(body.status).toBe('not_configured')
    expect(body.prs).toEqual([])
    expect(body.repos).toEqual([])
    expect(fetchNexusPendingPRs).not.toHaveBeenCalled()
  })

  it('returns no_repos (200) when configured but no repos resolve', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getNexusRepos).mockReturnValue([])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('no_repos')
    expect(fetchNexusPendingPRs).not.toHaveBeenCalled()
  })

  it('returns ok (200) with summarised PRs on the success path', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const rawPRs = [
      {
        owner: 'CleanExpo',
        repo: 'Unite-Group',
        number: 42,
        title: 'feat: thing',
        body: null,
        html_url: 'https://github.com/CleanExpo/Unite-Group/pull/42',
        created_at: '2026-06-22T00:00:00Z',
        user: 'bot',
        files: [],
        fileCount: 0,
        aiSummary: '',
      },
    ]
    const summarised = [{ ...rawPRs[0], aiSummary: 'Adds a thing.' }]
    vi.mocked(fetchNexusPendingPRs).mockResolvedValue(rawPRs as never)
    vi.mocked(summarisePRs).mockResolvedValue(summarised as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      status: string
      prs: Array<{ number: number; aiSummary: string }>
      repos: Array<{ owner: string; repo: string }>
    }
    expect(body.status).toBe('ok')
    expect(body.prs).toHaveLength(1)
    expect(body.prs[0].aiSummary).toBe('Adds a thing.')
    expect(body.repos).toEqual([{ owner: 'CleanExpo', repo: 'Unite-Group' }])
    expect(summarisePRs).toHaveBeenCalledWith(rawPRs)
  })

  it('500 when fetchNexusPendingPRs throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(fetchNexusPendingPRs).mockRejectedValue(new Error('GitHub down'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('GitHub down')
  })
})
