import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Fallback metadata for businesses that may not exist in DB yet
const FALLBACK_BUSINESSES: Record<string, { name: string; status: string; arr_aud: number }> = {
  'synthex':            { name: 'Synthex',       status: 'operational', arr_aud: 0 },
  'restoreassist':      { name: 'RestoreAssist', status: 'building',    arr_aud: 0 },
  'dr-nrpg':            { name: 'NRPG',          status: 'building',    arr_aud: 0 },
  'carsi':              { name: 'CARSI',          status: 'operational', arr_aud: 0 },
  'ccw-crm':            { name: 'CCW-CRM',       status: 'operational', arr_aud: 33000 },
  'disaster-recovery':  { name: 'DR Platform',   status: 'operational', arr_aud: 0 },
};

export type BusinessHealthRow = {
  id: string;
  name: string;
  status: string;
  arr_aud: number;
  overall_health: number | null;
  security_score: number | null;
  dependencies: number | null;
  security_findings: number | null;
  snapshot_at: string | null;
};

function healthToStatus(score: number): string {
  if (score >= 80) return 'operational';
  if (score >= 60) return 'building';
  if (score >= 40) return 'degraded';
  return 'down';
}

export async function GET() {
  const supabase = getAdminClient();

  // Query latest snapshot per project_id
  const { data: snapshots, error: snapshotError } = await supabase
    .from('pi_ceo_health_snapshots')
    .select('project_id, overall_health, security_score, dependencies, security_findings, snapshot_at')
    .order('snapshot_at', { ascending: false });

  if (snapshotError) {
    console.error('[empire/businesses] snapshot query error:', snapshotError.message);
  }

  // Deduplicate: keep only the latest snapshot per project_id
  const latestByProject = new Map<string, {
    project_id: string;
    overall_health: number | null;
    security_score: number | null;
    dependencies: number | null;
    security_findings: number | null;
    snapshot_at: string | null;
  }>();
  for (const row of (snapshots ?? [])) {
    if (!latestByProject.has(row.project_id)) {
      latestByProject.set(row.project_id, row);
    }
  }

  // Query businesses table
  const { data: bizRows, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, status, arr_aud, pi_ceo_key');

  if (bizError) {
    console.error('[empire/businesses] businesses query error:', bizError.message);
  }

  // Build merged result — start from either DB businesses or fallback list
  const results: BusinessHealthRow[] = [];

  if (bizRows && bizRows.length > 0) {
    for (const biz of bizRows) {
      const piKey = biz.pi_ceo_key ?? biz.id;
      const snap = latestByProject.get(piKey) ?? latestByProject.get(biz.id);
      const overallHealth = snap?.overall_health ?? null;

      results.push({
        id: biz.id,
        name: biz.name,
        status: overallHealth !== null ? healthToStatus(overallHealth) : (biz.status ?? 'unknown'),
        arr_aud: biz.arr_aud ?? 0,
        overall_health: overallHealth,
        security_score: snap?.security_score ?? null,
        dependencies: snap?.dependencies ?? null,
        security_findings: snap?.security_findings ?? null,
        snapshot_at: snap?.snapshot_at ?? null,
      });
    }
  } else {
    // Fallback: build from static list merged with any snapshots we found
    for (const [pid, meta] of Object.entries(FALLBACK_BUSINESSES)) {
      const snap = latestByProject.get(pid);
      const overallHealth = snap?.overall_health ?? null;

      results.push({
        id: pid,
        name: meta.name,
        status: overallHealth !== null ? healthToStatus(overallHealth) : meta.status,
        arr_aud: meta.arr_aud,
        overall_health: overallHealth,
        security_score: snap?.security_score ?? null,
        dependencies: snap?.dependencies ?? null,
        security_findings: snap?.security_findings ?? null,
        snapshot_at: snap?.snapshot_at ?? null,
      });
    }
  }

  const totalArr = results.reduce((s, b) => s + (b.arr_aud ?? 0), 0);
  const scoredBizs = results.filter(b => b.overall_health !== null);
  const avgHealth = scoredBizs.length > 0
    ? Math.round(scoredBizs.reduce((s, b) => s + (b.overall_health ?? 0), 0) / scoredBizs.length)
    : null;
  const atRisk = results.filter(b => b.overall_health !== null && b.overall_health < 60).length;
  const lastRescan = results
    .map(b => b.snapshot_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return NextResponse.json(
    {
      businesses: results,
      summary: {
        total_arr: totalArr,
        avg_health: avgHealth,
        at_risk_count: atRisk,
        last_rescan: lastRescan,
        has_live_data: snapshots !== null && (snapshots?.length ?? 0) > 0,
      },
      fetched_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
