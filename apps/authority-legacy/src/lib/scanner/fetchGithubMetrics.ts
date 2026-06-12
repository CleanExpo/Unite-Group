// UNI-1948 — Reusable GitHub metrics helper.
//
// Single source of truth for "what GitHub knows about this repo right now":
//   - latest commit timestamp on the default branch
//   - latest workflow-run state (CI green / failing / running / unknown)
//   - open Dependabot alerts count (null when alerts disabled)
//   - open pull-request count
//
// Used by BOTH:
//   - /api/empire/sources/github/[slug]/route.ts  (adapter — surfaces in UI)
//   - /api/cron/process-scan-requests/route.ts    (scanner — writes snapshots)
//
// NO MOCK DATA. If the GitHub API is unreachable, throw — the caller decides
// how to record the failure honestly (adapter returns status: 'err', scanner
// writes a snapshot with a security_score that reflects the unknown state).

import { execSync } from 'child_process';

const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 8000;

export type CiState = 'success' | 'failure' | 'in_progress' | 'unknown';

export interface GithubMetrics {
  /** owner/repo as supplied to the helper. */
  repo: string;
  /** repo default branch (e.g. "main"). null when repo lookup failed. */
  default_branch: string | null;
  /** true when the repo is archived on GitHub. */
  archived: boolean;
  /** repo html_url, useful for deep-linking. */
  html_url: string | null;
  /** Number of open Dependabot alerts. `null` when alerts are disabled (403/404). */
  dep_alerts_open: number | null;
  /** Latest workflow run state on the default branch. */
  ci_state: CiState;
  /** Latest workflow run conclusion (success / failure / cancelled / null). */
  ci_conclusion: string | null;
  /** Count of open PRs against the repo. */
  open_prs: number;
  /** ISO timestamp of the latest commit on the default branch, or null. */
  latest_commit_at: string | null;
  /** First line of the latest commit message, truncated to 60 chars. */
  latest_commit_message: string | null;
}

/** Resolve the GitHub PAT. Env var wins; fall back to macOS Keychain on dev boxes. */
export function resolveGithubToken(): string | null {
  const fromEnv = process.env.GITHUB_TOKEN;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  if (process.platform !== 'darwin') return null;
  try {
    const out = execSync(
      'security find-internet-password -s github.com -w 2>/dev/null',
      { encoding: 'utf8', timeout: 1500 }
    ).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

interface GhFetchOk<T> { ok: true; data: T }
interface GhFetchErr { ok: false; status: number; body: string }
type GhFetch<T> = GhFetchOk<T> | GhFetchErr;

async function ghFetch<T>(url: string, token: string): Promise<GhFetch<T>> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'unite-group-empire',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: body.slice(0, 300) };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

interface RepoResponse {
  default_branch: string;
  html_url: string;
  archived: boolean;
  pushed_at: string;
}

interface CommitResponse {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
}

interface WorkflowRunsResponse {
  workflow_runs: Array<{
    status: string;
    conclusion: string | null;
    updated_at: string;
  }>;
}

interface DependabotAlert { state: string }
interface PullResponse { state: string }

/**
 * Fetch live GitHub metrics for `owner/repo`.
 * Throws when the repo lookup itself fails (token missing, network down,
 * 404 on the repo). Sub-fetches (commits, workflows, alerts, PRs) degrade
 * gracefully to nulls / zeros — those failures are part of the metric.
 */
export async function fetchGithubMetrics(repo: string): Promise<GithubMetrics> {
  if (!repo || !repo.includes('/')) {
    throw new Error(`invalid repo: ${repo}`);
  }

  const token = resolveGithubToken();
  if (!token) {
    throw new Error('GITHUB_TOKEN missing');
  }

  const repoRes = await ghFetch<RepoResponse>(`${GITHUB_API}/repos/${repo}`, token);
  if (!repoRes.ok) {
    throw new Error(`GitHub repo ${repoRes.status}: ${repoRes.body.slice(0, 100)}`);
  }
  const repoData = repoRes.data;

  const [commitRes, runsRes, alertsRes, prsRes] = await Promise.all([
    ghFetch<CommitResponse>(
      `${GITHUB_API}/repos/${repo}/commits/${encodeURIComponent(repoData.default_branch)}`,
      token
    ),
    ghFetch<WorkflowRunsResponse>(
      `${GITHUB_API}/repos/${repo}/actions/runs?branch=${encodeURIComponent(repoData.default_branch)}&per_page=1`,
      token
    ),
    ghFetch<DependabotAlert[]>(
      `${GITHUB_API}/repos/${repo}/dependabot/alerts?state=open&per_page=100`,
      token
    ),
    ghFetch<PullResponse[]>(
      `${GITHUB_API}/repos/${repo}/pulls?state=open&per_page=100`,
      token
    ),
  ]);

  // Dependabot 403/404 = alerts not enabled. Report null, not zero — there's
  // a real difference between "0 alerts" and "we don't know".
  let depAlertsOpen: number | null;
  if (alertsRes.ok) {
    depAlertsOpen = alertsRes.data.length;
  } else if (alertsRes.status === 403 || alertsRes.status === 404) {
    depAlertsOpen = null;
  } else {
    depAlertsOpen = null;
  }

  const latestRun = runsRes.ok ? runsRes.data.workflow_runs[0] ?? null : null;
  const workflowStatus = latestRun?.status ?? null;
  const workflowConclusion = latestRun?.conclusion ?? null;

  let ciState: CiState;
  if (!latestRun) ciState = 'unknown';
  else if (workflowStatus === 'in_progress' || workflowStatus === 'queued') ciState = 'in_progress';
  else if (workflowConclusion === 'success') ciState = 'success';
  else if (workflowConclusion === 'failure') ciState = 'failure';
  else ciState = 'unknown';

  const openPrs = prsRes.ok ? prsRes.data.length : 0;

  const latestCommitAt = commitRes.ok ? commitRes.data.commit.author.date : repoData.pushed_at ?? null;
  const latestCommitMessage = commitRes.ok
    ? commitRes.data.commit.message.split('\n')[0].slice(0, 60)
    : null;

  return {
    repo,
    default_branch: repoData.default_branch,
    archived: repoData.archived,
    html_url: repoData.html_url,
    dep_alerts_open: depAlertsOpen,
    ci_state: ciState,
    ci_conclusion: workflowConclusion,
    open_prs: openPrs,
    latest_commit_at: latestCommitAt,
    latest_commit_message: latestCommitMessage,
  };
}
