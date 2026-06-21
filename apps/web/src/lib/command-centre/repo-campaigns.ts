// src/lib/command-centre/repo-campaigns.ts
//
// "Campaigns (repos)" overview for Mission Control — turns the portfolio
// registry projects into campaign entries with LIVE GitHub signal (open PRs,
// last commit), marking which repos are actively being worked.
//
// NorthStar "no fake-as-real": every entry carries an honest `source`. When
// GitHub isn't wired (no token) or a fetch fails, the entry says so — it never
// shows stale/mock activity as if live. Pure + dependency-injected (the GitHub
// fetch is a seam) so the derivation is unit-tested without network or secrets.

import type { CommandCentreProject } from './registry'

export type CampaignState =
  | 'building' // open PRs in flight — agents actively working
  | 'active' // recent commits, no open PRs
  | 'idle' // a repo, but quiet for a while
  | 'planned' // tracked product, no repo yet
  | 'not_connected' // GitHub not wired — can't tell
  | 'archived' // paused/retired

export type CampaignSource = 'live' | 'not_connected' | 'no_repo' | 'error'

export interface RepoSignal {
  defaultBranch: string
  openPRs: number
  lastCommitAt: string | null
  lastCommitMessage?: string | null
}

export type RepoSignalResult =
  | { ok: true; signal: RepoSignal }
  | { ok: false; reason: 'no_repo' | 'not_connected' | 'error'; detail?: string }

/** Fetch live signal for "owner/name". Injected (real GitHub in prod, fake in tests). */
export type GithubRepoFetcher = (repo: string) => Promise<RepoSignalResult>

export interface CampaignEntry {
  name: string
  repo: string | null
  purpose: string
  linearPrefix: string
  productionUrl: string | null
  state: CampaignState
  source: CampaignSource
  /** True when agents have work in flight or recent activity. */
  isActiveCampaign: boolean
  openPRs: number | null
  lastActivityAt: string | null
  detail: string | null
}

export interface BuildCampaignsInput {
  projects: CommandCentreProject[]
  fetchSignal: GithubRepoFetcher
  now: string
  /** Days of silence after which a repo with no open PRs is "idle". Default 14. */
  idleAfterDays?: number
}

const ARCHIVED_STATUSES = new Set(['archived', 'paused', 'retired', 'merged'])

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000)
}

/** Derive one campaign entry from a project + its (already fetched) signal. */
export function deriveCampaign(
  project: CommandCentreProject,
  result: RepoSignalResult,
  now: string,
  idleAfterDays: number,
): CampaignEntry {
  const base = {
    name: project.name,
    repo: project.github_repo,
    purpose: project.business_purpose,
    linearPrefix: project.linear_prefix,
    productionUrl: project.production_url,
  }

  if (ARCHIVED_STATUSES.has(project.status)) {
    return { ...base, state: 'archived', source: 'no_repo', isActiveCampaign: false, openPRs: null, lastActivityAt: null, detail: `status: ${project.status}` }
  }

  if (!result.ok) {
    if (result.reason === 'no_repo') {
      return { ...base, state: 'planned', source: 'no_repo', isActiveCampaign: false, openPRs: null, lastActivityAt: null, detail: 'no GitHub repo yet' }
    }
    return {
      ...base,
      state: 'not_connected',
      source: result.reason, // 'not_connected' | 'error'
      isActiveCampaign: false,
      openPRs: null,
      lastActivityAt: null,
      detail: result.detail ?? (result.reason === 'not_connected' ? 'GitHub not connected' : 'signal fetch failed'),
    }
  }

  const { openPRs, lastCommitAt } = result.signal
  let state: CampaignState
  if (openPRs > 0) state = 'building'
  else if (lastCommitAt && daysBetween(lastCommitAt, now) <= idleAfterDays) state = 'active'
  else state = 'idle'

  return {
    ...base,
    state,
    source: 'live',
    isActiveCampaign: state === 'building' || state === 'active',
    openPRs,
    lastActivityAt: lastCommitAt,
    detail: result.signal.lastCommitMessage ?? null,
  }
}

export interface RepoCampaignsPayload {
  source: 'cc:repo-campaigns'
  generatedAt: string
  githubConnected: boolean
  summary: { total: number; activeCampaigns: number; building: number; idle: number; planned: number; notConnected: number }
  campaigns: CampaignEntry[]
}

/** Build the full campaigns overview from the registry + a GitHub fetcher. */
export async function buildRepoCampaigns(input: BuildCampaignsInput): Promise<RepoCampaignsPayload> {
  const idleAfterDays = input.idleAfterDays ?? 14
  const campaigns = await Promise.all(
    input.projects.map(async (p) => {
      const result: RepoSignalResult = p.github_repo
        ? await input.fetchSignal(p.github_repo)
        : { ok: false, reason: 'no_repo' }
      return deriveCampaign(p, result, input.now, idleAfterDays)
    }),
  )

  return {
    source: 'cc:repo-campaigns',
    generatedAt: input.now,
    githubConnected: campaigns.some((c) => c.source === 'live'),
    summary: {
      total: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.isActiveCampaign).length,
      building: campaigns.filter((c) => c.state === 'building').length,
      idle: campaigns.filter((c) => c.state === 'idle').length,
      planned: campaigns.filter((c) => c.state === 'planned').length,
      notConnected: campaigns.filter((c) => c.source === 'not_connected' || c.source === 'error').length,
    },
    campaigns,
  }
}
