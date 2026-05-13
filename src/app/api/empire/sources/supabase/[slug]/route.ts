// Pillar 3 (UNI-1947) — Supabase Management adapter.
//
// Reads `supabase_project_ref` from public.businesses for the slug, then
// queries the Supabase Management API for the project's runtime status and
// security + performance advisor lints. Returns a unified BusinessSource with
// region, status, and the count of actionable (ERROR + WARN) advisor lints.
//
// NO MOCK DATA — Supabase API unreachable → status: 'err' + a real error,
// never a fake "ok".

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessSource } from '@/types/business-source';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPABASE_MGMT_API = 'https://api.supabase.com';
const FETCH_TIMEOUT_MS = 10000;
const USER_AGENT = 'unite-group-empire';

interface SupabaseProjectResponse {
  id: string;
  name: string;
  region: string;
  status: string; // ACTIVE_HEALTHY, COMING_UP, GOING_DOWN, INACTIVE, INIT_FAILED, PAUSED, etc.
  created_at?: string;
}

interface SupabaseLintsResponse {
  lints?: Array<{
    level: 'ERROR' | 'WARN' | 'INFO' | string;
    name?: string;
    title?: string;
    categories?: string[];
  }>;
  message?: string;
}

interface MgmtFetchOk<T> { ok: true; data: T }
interface MgmtFetchErr { ok: false; status: number; body: string }
type MgmtFetch<T> = MgmtFetchOk<T> | MgmtFetchErr;

async function mgmtFetch<T>(url: string, token: string): Promise<MgmtFetch<T>> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
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

function countActionableLints(payload: MgmtFetch<SupabaseLintsResponse>): number | null {
  if (!payload.ok) return null;
  const lints = payload.data.lints ?? [];
  return lints.filter((l) => l.level === 'ERROR' || l.level === 'WARN').length;
}

function deriveStatus(args: {
  projectStatus: string;
  securityActionable: number | null;
  performanceActionable: number | null;
}): BusinessSource['status'] {
  if (args.projectStatus !== 'ACTIVE_HEALTHY') {
    if (args.projectStatus === 'COMING_UP' || args.projectStatus === 'GOING_DOWN') return 'warn';
    return 'err';
  }
  const sec = args.securityActionable ?? 0;
  const perf = args.performanceActionable ?? 0;
  if (sec === 0 && perf === 0) return 'ok';
  if (sec + perf <= 5) return 'warn';
  return 'err';
}

async function fetchSupabase(slug: string): Promise<BusinessSource> {
  const supabase = getAdminClient();
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('supabase_project_ref')
    .eq('slug', slug)
    .not('is_sandbox', 'is', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return {
      source: 'supabase',
      status: 'err',
      summary: 'businesses lookup failed',
      last_update: null,
      error: String(bizErr.message).slice(0, 200),
    };
  }

  if (!biz?.supabase_project_ref) {
    return {
      source: 'supabase',
      status: 'unknown',
      summary: 'Supabase not configured',
      last_update: null,
    };
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token || token.trim().length === 0) {
    return {
      source: 'supabase',
      status: 'err',
      summary: 'SUPABASE_ACCESS_TOKEN missing',
      last_update: null,
      error: 'env not configured',
    };
  }

  const ref = biz.supabase_project_ref as string;

  try {
    const projectRes = await mgmtFetch<SupabaseProjectResponse>(
      `${SUPABASE_MGMT_API}/v1/projects/${ref}`,
      token.trim()
    );

    if (!projectRes.ok) {
      return {
        source: 'supabase',
        status: 'err',
        summary: `Supabase API ${projectRes.status}`,
        last_update: null,
        error: projectRes.body,
      };
    }

    // Advisor lints — best-effort. A 5xx or 4xx here shouldn't poison the project
    // status, so we degrade to "advisors unknown" rather than failing the whole call.
    const [secRes, perfRes] = await Promise.all([
      mgmtFetch<SupabaseLintsResponse>(
        `${SUPABASE_MGMT_API}/v1/projects/${ref}/advisors/security`,
        token.trim()
      ),
      mgmtFetch<SupabaseLintsResponse>(
        `${SUPABASE_MGMT_API}/v1/projects/${ref}/advisors/performance`,
        token.trim()
      ),
    ]);

    const securityActionable = countActionableLints(secRes);
    const performanceActionable = countActionableLints(perfRes);

    const project = projectRes.data;
    const status = deriveStatus({
      projectStatus: project.status,
      securityActionable,
      performanceActionable,
    });

    const advisorLabel = (() => {
      if (securityActionable === null && performanceActionable === null) return 'advisors unknown';
      const total = (securityActionable ?? 0) + (performanceActionable ?? 0);
      return `${total} advisor${total === 1 ? '' : 's'}`;
    })();

    const summary = `${project.region} · ${project.status} · ${advisorLabel}`;
    const dashboardUrl = `https://supabase.com/dashboard/project/${ref}`;

    return {
      source: 'supabase',
      status,
      summary,
      last_update: project.created_at ?? null,
      url: dashboardUrl,
      details: {
        project_ref: ref,
        project_name: project.name,
        region: project.region,
        project_status: project.status,
        security_advisors_actionable: securityActionable,
        performance_advisors_actionable: performanceActionable,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'supabase',
      status: 'err',
      summary: 'Supabase unreachable',
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
  const source = await fetchSupabase(slug);
  return NextResponse.json(source, { headers: { 'Cache-Control': 'no-store' } });
}
