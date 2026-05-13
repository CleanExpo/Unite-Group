// Pillar 3 (UNI-1947) — Linear adapter.
//
// Reads `linear_team_id` from public.businesses for the slug, then queries the
// Linear GraphQL API for the team's issue state distribution. Returns three
// numbers in the summary: in-progress, backlog, completed last 7 days.
//
// NO MOCK DATA — Linear unreachable → status: 'err' + a real error message,
// never a fake "ok".

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessSource } from '@/types/business-source';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LINEAR_GRAPHQL = 'https://api.linear.app/graphql';
const FETCH_TIMEOUT_MS = 8000;

interface LinearTeamIssuesResponse {
  data?: {
    team?: {
      id: string;
      key: string;
      name: string;
      organization?: { urlKey: string };
      activeIssues?: { nodes: Array<{ id: string }> };
      backlogIssues?: { nodes: Array<{ id: string }> };
      doneIssues?: { nodes: Array<{ id: string }> };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

function deriveStatus(activeCount: number): BusinessSource['status'] {
  if (activeCount > 20) return 'err';
  if (activeCount > 10) return 'warn';
  return 'ok';
}

async function fetchLinear(slug: string): Promise<BusinessSource> {
  const supabase = getAdminClient();
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('linear_team_id')
    .eq('slug', slug)
    .not('is_sandbox', 'is', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return {
      source: 'linear',
      status: 'err',
      summary: 'businesses lookup failed',
      last_update: null,
      error: String(bizErr.message).slice(0, 200),
    };
  }

  if (!biz?.linear_team_id) {
    return {
      source: 'linear',
      status: 'unknown',
      summary: 'Linear not configured',
      last_update: null,
    };
  }

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    return {
      source: 'linear',
      status: 'err',
      summary: 'LINEAR_API_KEY missing',
      last_update: null,
      error: 'env not configured',
    };
  }

  const teamId = biz.linear_team_id as string;

  // ISO timestamp for "7 days ago" so the doneIssues filter is server-side, not client-side.
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const query = `
    query($teamId: String!, $sevenDaysAgo: DateTimeOrDuration!) {
      team(id: $teamId) {
        id
        key
        name
        organization { urlKey }
        activeIssues: issues(filter: { state: { type: { eq: "started" } } }, first: 250) {
          nodes { id }
        }
        backlogIssues: issues(filter: { state: { type: { in: ["backlog", "unstarted"] } } }, first: 250) {
          nodes { id }
        }
        doneIssues: issues(filter: {
          state: { type: { in: ["completed"] } }
          completedAt: { gt: $sevenDaysAgo }
        }, first: 250) {
          nodes { id }
        }
      }
    }
  `;

  try {
    const res = await fetch(LINEAR_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'unite-group-empire',
      },
      body: JSON.stringify({ query, variables: { teamId, sevenDaysAgo } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        source: 'linear',
        status: 'err',
        summary: `Linear API ${res.status}`,
        last_update: null,
        error: body.slice(0, 300),
      };
    }

    const payload = (await res.json()) as LinearTeamIssuesResponse;

    if (payload.errors && payload.errors.length > 0) {
      return {
        source: 'linear',
        status: 'err',
        summary: 'Linear GraphQL error',
        last_update: null,
        error: payload.errors.map((e) => e.message).join('; ').slice(0, 300),
      };
    }

    const team = payload.data?.team;
    if (!team) {
      return {
        source: 'linear',
        status: 'err',
        summary: 'Linear team not found',
        last_update: null,
        error: `teamId=${teamId}`,
      };
    }

    const inProgress = team.activeIssues?.nodes.length ?? 0;
    const backlog = team.backlogIssues?.nodes.length ?? 0;
    const doneThisWeek = team.doneIssues?.nodes.length ?? 0;

    const status = deriveStatus(inProgress);

    const workspace = team.organization?.urlKey ?? 'unite-group';
    const url = `https://linear.app/${workspace}/team/${team.key}/active`;

    const summary = `${inProgress} in progress · ${backlog} backlog · ${doneThisWeek} done this week`;

    return {
      source: 'linear',
      status,
      summary,
      last_update: new Date().toISOString(),
      url,
      details: {
        team_id: team.id,
        team_key: team.key,
        team_name: team.name,
        in_progress: inProgress,
        backlog,
        done_last_7d: doneThisWeek,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'linear',
      status: 'err',
      summary: 'Linear unreachable',
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
  const source = await fetchLinear(slug);
  return NextResponse.json(source, { headers: { 'Cache-Control': 'no-store' } });
}
