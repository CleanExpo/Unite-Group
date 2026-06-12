// /api/empire/tickets/[slug]
//
// Returns the open Linear tickets for a business slug. Reads the canonical
// `linear_team_id` (Linear team UUID) from `public.businesses` — the hardcoded
// TEAM_MAP it replaced was a string-name match that never resolved against
// real Linear team names, so every brand returned `{tickets: []}`.
//
// Per Phill's no-mock rule:
//   - LINEAR_API_KEY missing  → 200 with `{tickets: [], error: 'Linear not configured'}`
//   - Linear unreachable      → 200 with `{tickets: [], error: <real reason>}`
//   - team_id NULL on the row → 200 with empty list + 'Linear team not configured'
//
// Cache: 60s in-memory per slug. Avoids hammering the Linear API when the
// Empire page polls every brand.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LINEAR_GRAPHQL = 'https://api.linear.app/graphql';
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60_000;

interface CachedTickets {
  body: unknown;
  expires_at: number;
}

const ticketCache = new Map<string, CachedTickets>();

interface LinearIssueNode {
  id: string;
  identifier: string;
  title: string;
  state: { name: string; type: string };
  priority: number;
  url: string;
  updatedAt: string;
}

interface LinearIssuesResponse {
  data?: {
    team?: {
      issues?: { nodes: LinearIssueNode[] };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const { slug } = await params;

  // 60s cache.
  const cached = ticketCache.get(slug);
  if (cached && cached.expires_at > Date.now()) {
    return NextResponse.json(cached.body);
  }

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
    const body = { tickets: [], error: `businesses lookup failed: ${bizErr.message}` };
    return NextResponse.json(body);
  }

  if (!biz?.linear_team_id) {
    const body = { tickets: [], error: 'Linear team not configured' };
    ticketCache.set(slug, { body, expires_at: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(body);
  }

  const LINEAR_KEY = process.env.LINEAR_API_KEY;
  if (!LINEAR_KEY) {
    return NextResponse.json({ tickets: [], error: 'Linear not configured' });
  }

  const teamId = biz.linear_team_id as string;

  const query = `
    query($teamId: String!) {
      team(id: $teamId) {
        issues(
          filter: { state: { type: { in: ["started", "unstarted"] } } }
          orderBy: updatedAt
          first: 15
        ) {
          nodes {
            id
            identifier
            title
            state { name type }
            priority
            url
            updatedAt
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(LINEAR_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: LINEAR_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { teamId } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = { tickets: [], error: `Linear API ${res.status}` };
      return NextResponse.json(body);
    }

    const payload = (await res.json()) as LinearIssuesResponse;

    if (payload.errors && payload.errors.length > 0) {
      const body = {
        tickets: [],
        error: payload.errors.map((e) => e.message).join('; ').slice(0, 300),
      };
      return NextResponse.json(body);
    }

    const issues = payload.data?.team?.issues?.nodes ?? [];

    const tickets = issues.map((i) => ({
      id: i.identifier,
      title: i.title.slice(0, 55),
      state: i.state.name,
      stateType: i.state.type,
      priority: i.priority,
      url: i.url,
    }));

    const body = { tickets };
    ticketCache.set(slug, { body, expires_at: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ tickets: [], error: `Linear fetch failed: ${msg.slice(0, 200)}` });
  }
}
