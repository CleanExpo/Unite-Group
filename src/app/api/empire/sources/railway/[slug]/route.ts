// Pillar 3 (UNI-1947) — Railway adapter.
//
// Reads `railway_service_id` from public.businesses for the slug, then queries
// the Railway GraphQL API for the service's latest deployment. Returns a
// unified BusinessSource describing deployment status, age, and dashboard URL.
//
// NO MOCK DATA — Railway unreachable → status: 'err' + a real error message,
// never a fake "ok".

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessSource } from '@/types/business-source';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RAILWAY_GRAPHQL = 'https://backboard.railway.app/graphql/v2';
const FETCH_TIMEOUT_MS = 8000;

interface RailwayServiceResponse {
  data?: {
    service: {
      id: string;
      name: string;
      project?: { id: string; name: string };
      deployments?: {
        edges: Array<{
          node: {
            id: string;
            status: string; // SUCCESS, FAILED, CRASHED, BUILDING, DEPLOYING, INITIALIZING, QUEUED, REMOVED, REMOVING, SKIPPED
            createdAt: string;
            staticUrl: string | null;
            url: string | null;
          };
        }>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

function deriveStatus(status: string): BusinessSource['status'] {
  switch (status) {
    case 'SUCCESS':
      return 'ok';
    case 'FAILED':
    case 'CRASHED':
      return 'err';
    case 'BUILDING':
    case 'DEPLOYING':
    case 'INITIALIZING':
    case 'QUEUED':
      return 'warn';
    case 'REMOVED':
    case 'REMOVING':
    case 'SKIPPED':
      return 'warn';
    default:
      return 'unknown';
  }
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

async function fetchRailway(slug: string): Promise<BusinessSource> {
  const supabase = getAdminClient();
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('railway_service_id')
    .eq('slug', slug)
    .not('is_sandbox', 'is', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return {
      source: 'railway',
      status: 'err',
      summary: 'businesses lookup failed',
      last_update: null,
      error: String(bizErr.message).slice(0, 200),
    };
  }

  if (!biz?.railway_service_id) {
    return {
      source: 'railway',
      status: 'unknown',
      summary: 'Railway not configured',
      last_update: null,
    };
  }

  const token = process.env.RAILWAY_API_TOKEN;
  if (!token || token.trim().length === 0) {
    return {
      source: 'railway',
      status: 'err',
      summary: 'RAILWAY_API_TOKEN missing',
      last_update: null,
      error: 'env not configured',
    };
  }

  const serviceId = biz.railway_service_id as string;

  const query = `
    query($id: String!) {
      service(id: $id) {
        id
        name
        project { id name }
        deployments(first: 1) {
          edges {
            node {
              id
              status
              createdAt
              staticUrl
              url
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(RAILWAY_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'unite-group-empire',
      },
      body: JSON.stringify({ query, variables: { id: serviceId } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        source: 'railway',
        status: 'err',
        summary: `Railway API ${res.status}`,
        last_update: null,
        error: body.slice(0, 300),
      };
    }

    const payload = (await res.json()) as RailwayServiceResponse;

    if (payload.errors && payload.errors.length > 0) {
      return {
        source: 'railway',
        status: 'err',
        summary: 'Railway GraphQL error',
        last_update: null,
        error: payload.errors.map((e) => e.message).join('; ').slice(0, 300),
      };
    }

    const service = payload.data?.service;
    if (!service) {
      return {
        source: 'railway',
        status: 'err',
        summary: 'Railway service not found',
        last_update: null,
        error: `serviceId=${serviceId}`,
      };
    }

    const latest = service.deployments?.edges?.[0]?.node;
    if (!latest) {
      return {
        source: 'railway',
        status: 'unknown',
        summary: 'no deployments yet',
        last_update: null,
        details: { service_id: serviceId, service_name: service.name },
      };
    }

    const status = deriveStatus(latest.status);
    const ageLabel = relativeTime(latest.createdAt);
    const dashboardUrl = service.project
      ? `https://railway.com/project/${service.project.id}/service/${service.id}`
      : undefined;

    const summary = `${service.name} · ${latest.status} · ${ageLabel}`;

    return {
      source: 'railway',
      status,
      summary,
      last_update: latest.createdAt,
      url: dashboardUrl,
      details: {
        service_id: service.id,
        service_name: service.name,
        project_id: service.project?.id ?? null,
        project_name: service.project?.name ?? null,
        deployment_id: latest.id,
        deployment_status: latest.status,
        static_url: latest.staticUrl,
        custom_url: latest.url,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'railway',
      status: 'err',
      summary: 'Railway unreachable',
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
  const source = await fetchRailway(slug);
  return NextResponse.json(source, { headers: { 'Cache-Control': 'no-store' } });
}
