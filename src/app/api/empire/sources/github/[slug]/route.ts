// Pillar 3 (UNI-1947) — GitHub adapter.
//
// Reads `github_repo` (owner/repo) from public.businesses for the slug and
// returns a unified BusinessSource describing live GitHub state. The actual
// API calls live in src/lib/scanner/fetchGithubMetrics.ts so the scanner cron
// and this adapter share one code path. NO MOCK DATA — GitHub unreachable
// surfaces as status: 'err' with a real error message.

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessSource } from '@/types/business-source';
import {
  fetchGithubMetrics,
  resolveGithubToken,
  type CiState,
} from '@/lib/scanner/fetchGithubMetrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function deriveStatus(args: {
  ciState: CiState;
  dependabotCount: number | null;
  archived: boolean;
}): BusinessSource['status'] {
  if (args.archived) return 'warn';
  if (args.ciState === 'failure' || (args.dependabotCount ?? 0) > 50) return 'err';
  if (args.ciState === 'in_progress') return 'warn';
  if ((args.dependabotCount ?? 0) >= 10) return 'warn';
  return 'ok';
}

function workflowLabel(ciState: CiState, conclusion: string | null): string {
  if (ciState === 'in_progress') return 'CI running';
  if (ciState === 'success') return 'CI green';
  if (ciState === 'failure') return 'CI failing';
  if (conclusion === 'cancelled') return 'CI cancelled';
  if (ciState === 'unknown') return 'no CI';
  return `CI ${conclusion ?? ciState}`;
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

  if (!resolveGithubToken()) {
    return {
      source: 'github',
      status: 'err',
      summary: 'GITHUB_TOKEN missing',
      last_update: null,
      error: 'env not configured',
    };
  }

  const repo = biz.github_repo as string;

  try {
    const metrics = await fetchGithubMetrics(repo);

    const dependabotKnown = metrics.dep_alerts_open !== null;
    const status = deriveStatus({
      ciState: metrics.ci_state,
      dependabotCount: metrics.dep_alerts_open,
      archived: metrics.archived,
    });

    const parts = [
      `${metrics.default_branch ?? 'main'}: ${metrics.latest_commit_message ?? 'no commits'}`,
      workflowLabel(metrics.ci_state, metrics.ci_conclusion),
      dependabotKnown ? `${metrics.dep_alerts_open} dep alerts` : 'dep alerts off',
      `${metrics.open_prs} open PR${metrics.open_prs === 1 ? '' : 's'}`,
    ];
    if (metrics.archived) parts.unshift('archived');

    return {
      source: 'github',
      status,
      summary: parts.join(' · '),
      last_update: metrics.latest_commit_at,
      url: metrics.html_url ?? undefined,
      details: {
        repo,
        default_branch: metrics.default_branch,
        archived: metrics.archived,
        workflow_status: metrics.ci_state,
        workflow_conclusion: metrics.ci_conclusion,
        dependabot_alerts_open: metrics.dep_alerts_open,
        open_pull_requests: metrics.open_prs,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish missing-token (caller can fix) from upstream failure.
    if (msg === 'GITHUB_TOKEN missing') {
      return {
        source: 'github',
        status: 'err',
        summary: 'GITHUB_TOKEN missing',
        last_update: null,
        error: 'env not configured',
      };
    }
    if (msg.startsWith('GitHub repo ')) {
      const m = msg.match(/GitHub repo (\d+)/);
      const code = m?.[1];
      return {
        source: 'github',
        status: 'err',
        summary: `GitHub repo ${code ?? 'error'}`,
        last_update: null,
        error: msg.slice(0, 300),
      };
    }
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
