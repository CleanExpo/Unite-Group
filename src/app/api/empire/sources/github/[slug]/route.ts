// Pillar 3 (UNI-1947) — GitHub adapter.
//
// Reads `github_repo` (owner/repo) from public.businesses for the slug, then
// pulls four signals from the GitHub REST API:
//   1. default branch latest commit (SHA + message + author + timestamp)
//   2. latest workflow run conclusion (success / failure / in_progress)
//   3. open Dependabot alerts count
//   4. open PR count
//
// Returns a unified BusinessSource. NO MOCK DATA — when GitHub is unreachable
// the response explicitly says so via status: 'err' + a human-readable summary.

import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessSource } from '@/types/business-source';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 8000;

/** Resolve the GitHub PAT. Env var wins; fall back to macOS Keychain on dev boxes. */
function resolveToken(): string | null {
  const fromEnv = process.env.GITHUB_TOKEN;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  // Dev-machine fallback: pull from Keychain if the env wasn't injected.
  // Production (Vercel) always has GITHUB_TOKEN set, so this path won't fire.
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

interface GithubFetchOptions {
  token: string;
  url: string;
}

async function ghFetch<T>({ token, url }: GithubFetchOptions): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
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
    status: string; // queued, in_progress, completed
    conclusion: string | null; // success, failure, cancelled, null while running
    updated_at: string;
  }>;
}

interface DependabotAlert { state: string }
interface PullResponse { state: string }

function deriveStatus(args: {
  workflowConclusion: string | null;
  workflowStatus: string | null;
  dependabotCount: number;
  archived: boolean;
}): BusinessSource['status'] {
  if (args.archived) return 'warn';
  if (args.workflowConclusion === 'failure' || args.dependabotCount > 50) return 'err';
  if (args.workflowStatus === 'in_progress' || args.workflowStatus === 'queued') return 'warn';
  if (args.dependabotCount >= 10) return 'warn';
  return 'ok';
}

function workflowLabel(conclusion: string | null, status: string | null): string {
  if (status === 'in_progress' || status === 'queued') return 'CI running';
  if (conclusion === 'success') return 'CI green';
  if (conclusion === 'failure') return 'CI failing';
  if (conclusion === 'cancelled') return 'CI cancelled';
  if (!conclusion && !status) return 'no CI';
  return `CI ${conclusion ?? status}`;
}

async function fetchGithub(slug: string): Promise<BusinessSource> {
  const supabase = getAdminClient();
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('github_repo')
    .eq('slug', slug)
    .not('is_sandbox', 'is', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return {
      source: 'github',
      status: 'err',
      summary: 'businesses lookup failed',
      last_update: null,
      error: String(bizErr.message).slice(0, 200),
    };
  }

  if (!biz?.github_repo) {
    return {
      source: 'github',
      status: 'unknown',
      summary: 'GitHub not configured',
      last_update: null,
    };
  }

  const token = resolveToken();
  if (!token) {
    return {
      source: 'github',
      status: 'err',
      summary: 'GITHUB_TOKEN missing',
      last_update: null,
      error: 'env not configured',
    };
  }

  const repo = biz.github_repo as string;
  const repoUrl = `${GITHUB_API}/repos/${repo}`;

  try {
    const repoRes = await ghFetch<RepoResponse>({ token, url: repoUrl });
    if (!repoRes.ok) {
      return {
        source: 'github',
        status: 'err',
        summary: `GitHub repo ${repoRes.status}`,
        last_update: null,
        error: repoRes.body,
      };
    }
    const repoData = repoRes.data;

    // Parallel: latest commit on default branch, latest workflow run, dependabot, open PRs.
    const [commitRes, runsRes, alertsRes, prsRes] = await Promise.all([
      ghFetch<CommitResponse>({
        token,
        url: `${GITHUB_API}/repos/${repo}/commits/${encodeURIComponent(repoData.default_branch)}`,
      }),
      ghFetch<WorkflowRunsResponse>({
        token,
        url: `${GITHUB_API}/repos/${repo}/actions/runs?branch=${encodeURIComponent(repoData.default_branch)}&per_page=1`,
      }),
      ghFetch<DependabotAlert[]>({
        token,
        url: `${GITHUB_API}/repos/${repo}/dependabot/alerts?state=open&per_page=100`,
      }),
      ghFetch<PullResponse[]>({
        token,
        url: `${GITHUB_API}/repos/${repo}/pulls?state=open&per_page=100`,
      }),
    ]);

    const latestRun = runsRes.ok ? runsRes.data.workflow_runs[0] ?? null : null;
    const workflowStatus = latestRun?.status ?? null;
    const workflowConclusion = latestRun?.conclusion ?? null;

    // Dependabot 403 = alerts disabled for the repo — that's an unknown, not an error.
    let dependabotCount = 0;
    let dependabotKnown = true;
    if (alertsRes.ok) {
      dependabotCount = alertsRes.data.length;
    } else if (alertsRes.status === 403 || alertsRes.status === 404) {
      dependabotKnown = false;
    }

    const openPRs = prsRes.ok ? prsRes.data.length : 0;

    const lastCommitMessage = commitRes.ok
      ? commitRes.data.commit.message.split('\n')[0].slice(0, 60)
      : null;
    const lastUpdate = commitRes.ok
      ? commitRes.data.commit.author.date
      : repoData.pushed_at;

    const status = deriveStatus({
      workflowConclusion,
      workflowStatus,
      dependabotCount,
      archived: repoData.archived,
    });

    const parts = [
      `${repoData.default_branch}: ${lastCommitMessage ?? 'no commits'}`,
      workflowLabel(workflowConclusion, workflowStatus),
      dependabotKnown ? `${dependabotCount} dep alerts` : 'dep alerts off',
      `${openPRs} open PR${openPRs === 1 ? '' : 's'}`,
    ];
    if (repoData.archived) parts.unshift('archived');

    return {
      source: 'github',
      status,
      summary: parts.join(' · '),
      last_update: lastUpdate,
      url: repoData.html_url,
      details: {
        repo,
        default_branch: repoData.default_branch,
        archived: repoData.archived,
        workflow_status: workflowStatus,
        workflow_conclusion: workflowConclusion,
        dependabot_alerts_open: dependabotKnown ? dependabotCount : null,
        open_pull_requests: openPRs,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'github',
      status: 'err',
      summary: 'GitHub unreachable',
      last_update: null,
      error: msg.slice(0, 200),
    };
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const source = await fetchGithub(slug);
  return NextResponse.json(source, { headers: { 'Cache-Control': 'no-store' } });
}
