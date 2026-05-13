// Pillar 3 (UNI-1947) — Vercel adapter.
//
// Reads `vercel_project` (project ID, e.g. prj_xxx) from public.businesses for
// the slug, then queries the Vercel REST API for the latest production
// deployment. Returns a unified BusinessSource describing build state, age,
// and the deploy URL.
//
// NO MOCK DATA — Vercel unreachable → status: 'err' + a real error message,
// never a fake "ok".

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessSource } from '@/types/business-source';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VERCEL_API = 'https://api.vercel.com';
const FETCH_TIMEOUT_MS = 8000;
const STALE_BUILDING_MS = 30 * 60 * 1000; // 30 minutes

interface VercelDeployment {
  uid: string;
  name: string;
  url: string; // deployment URL host, no scheme
  state: 'READY' | 'BUILDING' | 'INITIALIZING' | 'QUEUED' | 'ERROR' | 'CANCELED' | string;
  readyState?: string;
  created: number;       // epoch ms
  createdAt?: number;    // epoch ms (alias)
  buildingAt?: number;
  ready?: number;
  meta?: {
    githubCommitRef?: string;
    githubCommitMessage?: string;
  };
  target?: string | null;
}

interface VercelDeploymentsResponse {
  deployments: VercelDeployment[];
}

function deriveStatus(args: {
  state: string;
  startedAt: number | null;
}): BusinessSource['status'] {
  if (args.state === 'ERROR' || args.state === 'CANCELED') return 'err';
  if (args.state === 'READY') return 'ok';
  // BUILDING / INITIALIZING / QUEUED
  if (args.startedAt && Date.now() - args.startedAt > STALE_BUILDING_MS) {
    return 'err'; // stuck for > 30min — surface as broken
  }
  return 'warn';
}

function relativeTime(epochMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

async function fetchVercel(slug: string): Promise<BusinessSource> {
  const supabase = getAdminClient();
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('vercel_project')
    .eq('slug', slug)
    .not('is_sandbox', 'is', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return {
      source: 'vercel',
      status: 'err',
      summary: 'businesses lookup failed',
      last_update: null,
      error: String(bizErr.message).slice(0, 200),
    };
  }

  if (!biz?.vercel_project) {
    return {
      source: 'vercel',
      status: 'unknown',
      summary: 'Vercel not configured',
      last_update: null,
    };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token || token.trim().length === 0) {
    return {
      source: 'vercel',
      status: 'err',
      summary: 'VERCEL_TOKEN missing',
      last_update: null,
      error: 'env not configured',
    };
  }

  const projectId = biz.vercel_project as string;
  const url = `${VERCEL_API}/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'User-Agent': 'unite-group-empire',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        source: 'vercel',
        status: 'err',
        summary: `Vercel API ${res.status}`,
        last_update: null,
        error: body.slice(0, 300),
      };
    }

    const payload = (await res.json()) as VercelDeploymentsResponse;
    const latest = payload.deployments?.[0];

    if (!latest) {
      return {
        source: 'vercel',
        status: 'unknown',
        summary: 'no production deployments yet',
        last_update: null,
        details: { project_id: projectId },
      };
    }

    const createdMs = latest.createdAt ?? latest.created;
    const startedAt = latest.buildingAt ?? createdMs;
    const status = deriveStatus({ state: latest.state, startedAt });

    const ref = latest.meta?.githubCommitRef ?? 'prod';
    const ageLabel = relativeTime(createdMs);
    const deploymentUrl = latest.url ? `https://${latest.url}` : undefined;

    const summary = `prod: ${ref} · ${latest.state} · ${ageLabel}`;

    return {
      source: 'vercel',
      status,
      summary,
      last_update: new Date(createdMs).toISOString(),
      url: deploymentUrl,
      details: {
        project_id: projectId,
        deployment_id: latest.uid,
        state: latest.state,
        ref,
        commit_message: latest.meta?.githubCommitMessage ?? null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'vercel',
      status: 'err',
      summary: 'Vercel unreachable',
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
  const source = await fetchVercel(slug);
  return NextResponse.json(source, { headers: { 'Cache-Control': 'no-store' } });
}
