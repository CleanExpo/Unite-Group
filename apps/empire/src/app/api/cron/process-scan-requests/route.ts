// UNI-1948 — Pi-CEO scanner worker.
//
// /api/empire/rescan/[slug] enqueues a 'pending' row into public.scan_requests.
// This route — fired by a Vercel cron every 5 minutes (see vercel.json) —
// claims the oldest pending row, runs a real scan using the same data sources
// as the /api/empire/sources/* adapters (GitHub + Supabase Management API +
// Linear team active issue count), computes security_score / overall_health,
// inserts a row into pi_ceo_health_snapshots, and links the snapshot back to
// the scan_requests row.
//
// Auth: Bearer ${CRON_SECRET}. Vercel cron supplies this header automatically.
//
// NO MOCK DATA. When GitHub or Supabase is unreachable, the snapshot row still
// lands — security_score reflects the unknown state (penalised by 20 for the
// missing signal) — so the dashboard always shows fresh data after a scan.

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { fetchGithubMetrics, type GithubMetrics } from '@/lib/scanner/fetchGithubMetrics';
import { fetchSupabaseAdvisors, type SupabaseAdvisors } from '@/lib/scanner/fetchSupabaseAdvisors';
import { timingSafeBearerMatch } from '@/lib/security/safe-compare';
import { computeSecurityScore, computeOverallHealth } from './_helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ScanRequestRow {
  id: string;
  slug: string;
  requested_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface BusinessRow {
  id: string;
  slug: string;
  pi_ceo_key: string | null;
  github_repo: string | null;
  supabase_project_ref: string | null;
  linear_team_id: string | null;
}

interface SnapshotInsert {
  project_id: string;
  overall_health: number;
  security_score: number;
  code_quality: number | null;
  dependencies: number | null;
  deployment_health: number | null;
  security_findings: number;
  snapshot_at: string;
}

const LINEAR_GRAPHQL = 'https://api.linear.app/graphql';
const FETCH_TIMEOUT_MS = 8000;

/** Active (in-progress) issue count for a Linear team. Null on any failure. */
async function fetchLinearActiveCount(teamId: string): Promise<number | null> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return null;

  const query = `
    query($teamId: String!) {
      team(id: $teamId) {
        activeIssues: issues(filter: { state: { type: { eq: "started" } } }, first: 250) {
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
      body: JSON.stringify({ query, variables: { teamId } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      data?: { team?: { activeIssues?: { nodes: Array<{ id: string }> } } | null };
    };
    return payload.data?.team?.activeIssues?.nodes.length ?? null;
  } catch {
    return null;
  }
}

/** Run the actual scan for one business row. Returns a snapshot ready to insert. */
async function runScan(biz: BusinessRow): Promise<{
  snapshot: SnapshotInsert;
  github: GithubMetrics | null;
  supabase: SupabaseAdvisors | null;
  linear_in_progress: number | null;
}> {
  // GitHub (required — if absent, caller rejects earlier).
  let github: GithubMetrics | null = null;
  let githubError: string | null = null;
  if (biz.github_repo) {
    try {
      github = await fetchGithubMetrics(biz.github_repo);
    } catch (err) {
      githubError = err instanceof Error ? err.message : String(err);
    }
  }

  // Supabase (optional).
  let supabase: SupabaseAdvisors | null = null;
  if (biz.supabase_project_ref) {
    try {
      supabase = await fetchSupabaseAdvisors(biz.supabase_project_ref);
    } catch {
      // Honest skip — overall_health absorbs the unknown via the github_known flag.
      supabase = null;
    }
  }

  // Linear (optional).
  const linearInProgress = biz.linear_team_id
    ? await fetchLinearActiveCount(biz.linear_team_id)
    : null;

  const depAlertsOpen = github?.dep_alerts_open ?? null;
  const supabaseSecCount = supabase?.security_count ?? null;
  const ciFailing = github?.ci_state === 'failure';
  const githubKnown = github !== null;

  const securityScore = computeSecurityScore({
    dep_alerts_open: depAlertsOpen,
    supabase_security_count: supabaseSecCount,
    ci_failing: ciFailing,
    github_known: githubKnown,
  });

  // security_findings: total actionable issues (Dependabot + Supabase security).
  const securityFindings =
    (depAlertsOpen ?? 0) + (supabaseSecCount ?? 0);

  const overallHealth = computeOverallHealth({
    security_score: securityScore,
    latest_commit_at: github?.latest_commit_at ?? null,
    linear_in_progress: linearInProgress,
  });

  // Deploys component standalone (for deployment_health column).
  // Mirror the inline logic above — keep one source of truth via computeOverallHealth.
  let deploymentHealth: number | null = null;
  if (github?.latest_commit_at) {
    const ageDays = (Date.now() - new Date(github.latest_commit_at).getTime()) / 86_400_000;
    if (ageDays <= 7) deploymentHealth = 100;
    else if (ageDays >= 30) deploymentHealth = 0;
    else deploymentHealth = Math.round(100 * (1 - (ageDays - 7) / 23));
  }

  // We don't yet have a code-quality signal — leave null.
  // dependencies column: leave null (we don't fetch package.json to keep the
  // scan fast; the column was previously a total deps count which we can't
  // honestly compute without a tree-walk).
  const snapshot: SnapshotInsert = {
    project_id: biz.pi_ceo_key ?? biz.slug,
    overall_health: overallHealth,
    security_score: securityScore,
    code_quality: null,
    dependencies: null,
    deployment_health: deploymentHealth,
    security_findings: securityFindings,
    snapshot_at: new Date().toISOString(),
  };

  // Surface the github error in logs but don't poison the snapshot — the
  // scorer already penalised the row.
  if (githubError) {
    console.warn(`[scanner] ${biz.slug}: github fetch failed: ${githubError}`);
  }

  return { snapshot, github, supabase, linear_in_progress: linearInProgress };
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!timingSafeBearerMatch(auth, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();

  // 1. Claim the oldest pending row.
  const { data: pending, error: pendingErr } = await supabase
    .from('scan_requests')
    .select('id, slug, requested_at, status')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingErr) {
    return NextResponse.json(
      { ok: false, error: `pending lookup failed: ${pendingErr.message}` },
      { status: 500 }
    );
  }
  if (!pending) {
    return NextResponse.json({ ok: true, processed: 0, message: 'queue empty' });
  }

  const row = pending as ScanRequestRow;

  const { error: claimErr } = await supabase
    .from('scan_requests')
    .update({ status: 'running' })
    .eq('id', row.id)
    .eq('status', 'pending');

  if (claimErr) {
    return NextResponse.json(
      { ok: false, error: `claim failed: ${claimErr.message}` },
      { status: 500 }
    );
  }

  // 2. Load business row by slug.
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('id, slug, pi_ceo_key, github_repo, supabase_project_ref, linear_team_id')
    .eq('slug', row.slug)
    .not('is_sandbox', 'is', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bizErr || !biz) {
    return await failRow(row.id, bizErr?.message ?? `business not found for slug "${row.slug}"`);
  }

  const business = biz as BusinessRow;

  // 3. Guard: github_repo is the minimum viable signal for a real scan.
  if (!business.github_repo) {
    return await failRow(row.id, 'GitHub repo not configured for this business');
  }

  // 4. Run the scan.
  let snapshot: SnapshotInsert;
  try {
    const result = await runScan(business);
    snapshot = result.snapshot;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return await failRow(row.id, `scan failed: ${msg}`);
  }

  // 5. INSERT snapshot.
  const { data: inserted, error: insertErr } = await supabase
    .from('pi_ceo_health_snapshots')
    .insert(snapshot)
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return await failRow(row.id, `snapshot insert failed: ${insertErr?.message ?? 'no row returned'}`);
  }

  const snapshotId = (inserted as { id: number }).id;

  // 6. Mark scan_request completed and link the snapshot.
  const { error: completeErr } = await supabase
    .from('scan_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      snapshot_id: snapshotId,
      error: null,
    })
    .eq('id', row.id);

  if (completeErr) {
    return NextResponse.json(
      { ok: false, error: `complete write failed: ${completeErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    processed: 1,
    id: row.id,
    slug: row.slug,
    status: 'completed',
    snapshot_id: snapshotId,
    security_score: snapshot.security_score,
    overall_health: snapshot.overall_health,
    security_findings: snapshot.security_findings,
  });
}

/** Update a scan_request to status='failed' with the given error. */
async function failRow(id: string, error: string): Promise<Response> {
  const supabase = getAdminClient();
  const { error: failErr } = await supabase
    .from('scan_requests')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: error.slice(0, 500),
    })
    .eq('id', id);

  if (failErr) {
    return NextResponse.json(
      { ok: false, error: `fail write failed: ${failErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    processed: 1,
    id,
    status: 'failed',
    reason: error,
  });
}
