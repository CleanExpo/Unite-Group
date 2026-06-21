import { describe, it, expect, vi } from 'vitest'
import { deriveCampaign, buildRepoCampaigns, type RepoSignalResult, type GithubRepoFetcher } from '../repo-campaigns'
import { makeGithubRepoFetcher } from '../repo-campaigns-github'
import type { CommandCentreProject } from '../registry'

const NOW = '2026-06-21T00:00:00.000Z'

function project(over: Partial<CommandCentreProject> = {}): CommandCentreProject {
  return {
    name: 'Synthex',
    repo_path: 'D:/Synthex',
    github_repo: 'CleanExpo/Synthex',
    business_purpose: 'Marketing platform',
    brand_rules_ref: '',
    deployment_target: 'Vercel',
    owner: 'phill',
    status: 'active',
    evidence_vault_path: '',
    validation_commands: [],
    linear_prefix: 'UNI',
    production_url: null,
    ...over,
  }
}

const okSignal = (over: Partial<{ openPRs: number; lastCommitAt: string | null }> = {}): RepoSignalResult => ({
  ok: true,
  signal: { defaultBranch: 'main', openPRs: 0, lastCommitAt: '2026-06-20T00:00:00.000Z', ...over },
})

describe('deriveCampaign', () => {
  it('marks a repo with open PRs as building (active campaign)', () => {
    const c = deriveCampaign(project(), okSignal({ openPRs: 2 }), NOW, 14)
    expect(c.state).toBe('building')
    expect(c.isActiveCampaign).toBe(true)
    expect(c.openPRs).toBe(2)
  })

  it('marks a recently-committed repo as active', () => {
    const c = deriveCampaign(project(), okSignal({ openPRs: 0, lastCommitAt: '2026-06-20T00:00:00.000Z' }), NOW, 14)
    expect(c.state).toBe('active')
    expect(c.isActiveCampaign).toBe(true)
  })

  it('marks a long-quiet repo as idle (not an active campaign)', () => {
    const c = deriveCampaign(project(), okSignal({ openPRs: 0, lastCommitAt: '2026-01-01T00:00:00.000Z' }), NOW, 14)
    expect(c.state).toBe('idle')
    expect(c.isActiveCampaign).toBe(false)
  })

  it('is planned when the product has no repo', () => {
    const c = deriveCampaign(project({ github_repo: null }), { ok: false, reason: 'no_repo' }, NOW, 14)
    expect(c.state).toBe('planned')
    expect(c.source).toBe('no_repo')
  })

  it('is honest (not_connected) when GitHub is not wired — never fakes activity', () => {
    const c = deriveCampaign(project(), { ok: false, reason: 'not_connected', detail: 'GITHUB_TOKEN not configured' }, NOW, 14)
    expect(c.state).toBe('not_connected')
    expect(c.source).toBe('not_connected')
    expect(c.isActiveCampaign).toBe(false)
    expect(c.openPRs).toBeNull()
  })

  it('surfaces error state honestly', () => {
    const c = deriveCampaign(project(), { ok: false, reason: 'error', detail: 'repo not found' }, NOW, 14)
    expect(c.source).toBe('error')
    expect(c.detail).toBe('repo not found')
  })

  it('treats merged/retired status as archived', () => {
    const c = deriveCampaign(project({ status: 'archived' }), okSignal(), NOW, 14)
    expect(c.state).toBe('archived')
    expect(c.isActiveCampaign).toBe(false)
  })
})

describe('buildRepoCampaigns', () => {
  it('summarises active campaigns and respects no-repo projects', async () => {
    const fetchSignal: GithubRepoFetcher = async (repo) =>
      repo === 'CleanExpo/Synthex' ? okSignal({ openPRs: 1 }) : okSignal({ openPRs: 0, lastCommitAt: '2026-01-01T00:00:00.000Z' })
    const payload = await buildRepoCampaigns({
      projects: [project(), project({ name: 'CARSI', github_repo: 'CleanExpo/CARSI' }), project({ name: 'Future', github_repo: null, status: 'stub' })],
      fetchSignal,
      now: NOW,
    })
    expect(payload.summary.total).toBe(3)
    expect(payload.summary.building).toBe(1)
    expect(payload.summary.idle).toBe(1)
    expect(payload.summary.planned).toBe(1)
    expect(payload.githubConnected).toBe(true)
  })

  it('reports githubConnected:false when nothing returns live', async () => {
    const fetchSignal: GithubRepoFetcher = async () => ({ ok: false, reason: 'not_connected' })
    const payload = await buildRepoCampaigns({ projects: [project()], fetchSignal, now: NOW })
    expect(payload.githubConnected).toBe(false)
    expect(payload.summary.notConnected).toBe(1)
  })
})

describe('makeGithubRepoFetcher', () => {
  it('returns not_connected without a token (no network call)', async () => {
    const fetchFn = vi.fn()
    const r = await makeGithubRepoFetcher({ token: undefined, fetchFn: fetchFn as unknown as typeof fetch })('CleanExpo/Synthex')
    expect(r).toMatchObject({ ok: false, reason: 'not_connected' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('combines repo + open PRs into a live signal', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/repos/CleanExpo/Synthex')) {
        return { ok: true, status: 200, json: async () => ({ default_branch: 'main', pushed_at: '2026-06-20T10:00:00.000Z' }) } as Response
      }
      return { ok: true, status: 200, json: async () => [{}, {}, {}] } as Response // 3 open PRs
    })
    const r = await makeGithubRepoFetcher({ token: 'tok', fetchFn: fetchFn as unknown as typeof fetch })('CleanExpo/Synthex')
    expect(r).toEqual({ ok: true, signal: { defaultBranch: 'main', openPRs: 3, lastCommitAt: '2026-06-20T10:00:00.000Z' } })
  })

  it('is honest on a 404', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response)
    const r = await makeGithubRepoFetcher({ token: 'tok', fetchFn: fetchFn as unknown as typeof fetch })('CleanExpo/Nope')
    expect(r).toMatchObject({ ok: false, reason: 'error', detail: 'repo not found' })
  })
})
