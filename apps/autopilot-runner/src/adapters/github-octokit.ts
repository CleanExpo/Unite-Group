// apps/autopilot-runner/src/adapters/github-octokit.ts
//
// Concrete GithubOps backed by Octokit + GitHub App installation auth (the
// runner App). The REST calls are reached through a small `OctokitLike` seam so
// the mapping is unit-tested with a fake; `octokitGithubOpsFromEnv` builds the
// real App-authed client. Verified end-to-end against the live App on the first
// supervised run.

import type { GithubOps } from './github'
import type { MergeContext } from '../merge-policy'

/** The subset of the Octokit REST surface the runner uses. */
export interface OctokitLike {
  pulls: {
    create(p: { owner: string; repo: string; title: string; head: string; base: string; body: string }): Promise<{ data: { number: number; html_url: string } }>
    get(p: { owner: string; repo: string; pull_number: number }): Promise<{ data: { head: { sha: string }; mergeable_state?: string } }>
    listReviews(p: { owner: string; repo: string; pull_number: number }): Promise<{ data: Array<{ state: string; submitted_at?: string | null }> }>
    merge(p: { owner: string; repo: string; pull_number: number; merge_method: string }): Promise<{ data: { merged: boolean; message?: string } }>
  }
  issues: {
    addLabels(p: { owner: string; repo: string; issue_number: number; labels: string[] }): Promise<unknown>
    listLabelsOnIssue(p: { owner: string; repo: string; issue_number: number }): Promise<{ data: Array<{ name: string }> }>
  }
  checks: {
    listForRef(p: { owner: string; repo: string; ref: string }): Promise<{ data: { check_runs: Array<{ status: string; conclusion: string | null }> } }>
  }
  repos: {
    getCombinedStatusForRef(p: { owner: string; repo: string; ref: string }): Promise<{ data: { state: string } }>
  }
}

export interface Repo {
  owner: string
  name: string
}

/** Aggregate check-runs + the combined commit status into one CI verdict. */
export function aggregateCi(
  checkRuns: Array<{ status: string; conclusion: string | null }>,
  combinedState: string,
): MergeContext['ci'] {
  const FAIL = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'stale'])
  if (combinedState === 'failure' || combinedState === 'error') return 'failure'
  for (const r of checkRuns) {
    if (r.status !== 'completed') return 'pending'
    if (r.conclusion && FAIL.has(r.conclusion)) return 'failure'
  }
  if (combinedState === 'pending') return 'pending'
  return 'success'
}

/** Map the latest submitted review to a verdict. */
export function latestReviewVerdict(reviews: Array<{ state: string; submitted_at?: string | null }>): MergeContext['review'] {
  const submitted = reviews.filter((r) => r.submitted_at)
  const last = submitted[submitted.length - 1]
  if (!last) return 'none'
  if (last.state === 'APPROVED') return 'approved'
  if (last.state === 'CHANGES_REQUESTED') return 'changes_requested'
  return 'none'
}

/** Build a GithubOps over an injected Octokit-like client. */
export function createGithubOps(client: OctokitLike, repo: Repo): GithubOps {
  const base = { owner: repo.owner, repo: repo.name }

  async function headSha(prNumber: number): Promise<string> {
    const { data } = await client.pulls.get({ ...base, pull_number: prNumber })
    return data.head.sha
  }

  return {
    async createPullRequest(input) {
      const { data } = await client.pulls.create({ ...base, ...input })
      return { number: data.number, url: data.html_url }
    },
    async addLabels(prNumber, labels) {
      await client.issues.addLabels({ ...base, issue_number: prNumber, labels })
    },
    async getCiState(prNumber) {
      const ref = await headSha(prNumber)
      const [checks, combined] = await Promise.all([
        client.checks.listForRef({ ...base, ref }),
        client.repos.getCombinedStatusForRef({ ...base, ref }),
      ])
      return aggregateCi(checks.data.check_runs, combined.data.state)
    },
    async getReviewVerdict(prNumber) {
      const { data } = await client.pulls.listReviews({ ...base, pull_number: prNumber })
      return latestReviewVerdict(data)
    },
    async getPrLabels(prNumber) {
      const { data } = await client.issues.listLabelsOnIssue({ ...base, issue_number: prNumber })
      return data.map((l) => l.name)
    },
    async isUpToDateWithBase(prNumber) {
      const { data } = await client.pulls.get({ ...base, pull_number: prNumber })
      return data.mergeable_state !== 'behind'
    },
    async squashMerge(prNumber) {
      const { data } = await client.pulls.merge({ ...base, pull_number: prNumber, merge_method: 'squash' })
      return { merged: data.merged, message: data.message }
    },
  }
}

/** Parse "owner/name" into a Repo. */
export function parseRepo(value: string): Repo {
  const [owner, name] = value.split('/')
  if (!owner || !name) throw new Error(`invalid GH_REPO (want owner/name): ${value}`)
  return { owner, name }
}

/**
 * Build a GithubOps authed as the runner GitHub App installation, from env:
 * GH_RUNNER_APP_ID, GH_RUNNER_PRIVATE_KEY, GH_RUNNER_INSTALLATION_ID, GH_REPO.
 * Octokit is imported lazily so unit tests never need the real package wired.
 */
export async function octokitGithubOpsFromEnv(env: NodeJS.ProcessEnv): Promise<GithubOps> {
  const appId = env.GH_RUNNER_APP_ID
  const privateKey = env.GH_RUNNER_PRIVATE_KEY
  const installationId = env.GH_RUNNER_INSTALLATION_ID
  if (!appId || !privateKey || !installationId) {
    throw new Error('runner GitHub App env missing (GH_RUNNER_APP_ID / GH_RUNNER_PRIVATE_KEY / GH_RUNNER_INSTALLATION_ID)')
  }
  const { Octokit } = await import('@octokit/rest')
  const { createAppAuth } = await import('@octokit/auth-app')
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: Number(appId), privateKey, installationId: Number(installationId) },
  })
  return createGithubOps(octokit as unknown as OctokitLike, parseRepo(env.GH_REPO ?? 'CleanExpo/Unite-Group'))
}

/** Mint a short-lived runner-App installation token for git (clone/push) auth. */
export async function getRunnerInstallationToken(env: NodeJS.ProcessEnv): Promise<string> {
  const appId = env.GH_RUNNER_APP_ID
  const privateKey = env.GH_RUNNER_PRIVATE_KEY
  const installationId = env.GH_RUNNER_INSTALLATION_ID
  if (!appId || !privateKey || !installationId) {
    throw new Error('runner GitHub App env missing for token mint')
  }
  const { createAppAuth } = await import('@octokit/auth-app')
  const auth = createAppAuth({ appId: Number(appId), privateKey, installationId: Number(installationId) })
  const result = await auth({ type: 'installation' })
  return result.token
}
