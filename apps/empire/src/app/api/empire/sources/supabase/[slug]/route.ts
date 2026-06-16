// Pillar 3 (UNI-1947) — Supabase Management adapter.
//
// Reads `supabase_project_ref` from public.businesses for the slug and returns
// a unified BusinessSource describing live project status + actionable lint
// counts. The actual API calls live in src/lib/scanner/fetchSupabaseAdvisors.ts
// so the scanner cron and this adapter share one code path. NO MOCK DATA.

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import type { BusinessSource } from '@/types/business-source';
import { fetchSupabaseAdvisors } from '@/lib/scanner/fetchSupabaseAdvisors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const advisors = await fetchSupabaseAdvisors(ref);

    const securityActionable = advisors.security_count;
    const performanceActionable = advisors.performance_count;

    const status = deriveStatus({
      projectStatus: advisors.project_status,
      securityActionable,
      performanceActionable,
    });

    const advisorLabel = (() => {
      if (securityActionable === null && performanceActionable === null) return 'advisors unknown';
      const total = (securityActionable ?? 0) + (performanceActionable ?? 0);
      return `${total} advisor${total === 1 ? '' : 's'}`;
    })();

    const summary = `${advisors.region} · ${advisors.project_status} · ${advisorLabel}`;
    const dashboardUrl = `https://supabase.com/dashboard/project/${ref}`;

    return {
      source: 'supabase',
      status,
      summary,
      last_update: advisors.created_at,
      url: dashboardUrl,
      details: {
        project_ref: ref,
        project_name: advisors.project_name,
        region: advisors.region,
        project_status: advisors.project_status,
        security_advisors_actionable: securityActionable,
        performance_advisors_actionable: performanceActionable,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('Supabase project ')) {
      // Preserve the existing summary contract ("Supabase API 404" etc.)
      const code = msg.match(/Supabase project (\d+)/)?.[1] ?? 'error';
      return {
        source: 'supabase',
        status: 'err',
        summary: `Supabase API ${code}`,
        last_update: null,
        error: msg.slice(0, 300),
      };
    }
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
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const { slug } = await params;
  const source = await fetchSupabase(slug);
  return NextResponse.json(source, { headers: { 'Cache-Control': 'no-store' } });
}
