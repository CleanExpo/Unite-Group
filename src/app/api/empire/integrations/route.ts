import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// NOTE: Auth path uses a static `PI_CEO_API_KEY` compare because the
// `@/lib/auth/admin-jwt` helper referenced by Plan 2 Task 12 does not yet exist
// in this repo (Task 15 of the security-sweep plan introduces it). Per the
// task brief: timing-unsafe compare is acceptable here — H1 deferred globally.
function isAuthorized(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.PI_CEO_API_KEY ?? '';
  if (!expected) return false;
  return token === expected;
}

export async function GET(req: Request) {
  const auth = req.headers.get('x-admin-token');
  if (!isAuthorized(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getAdminClient();

  const [
    syncState,
    repos,
    openPRs,
    vercelProjects,
    railwayServices,
    doApps,
    supabaseProjects,
    opIndex,
    linearIssues,
    stripeMtd,
    composio,
  ] = await Promise.all([
    sb.from('integration_sync_state').select('*'),
    sb.from('integration_github_repos').select('*'),
    sb.from('integration_github_prs').select('*').eq('state', 'open'),
    sb.from('integration_vercel_projects').select('*'),
    sb.from('integration_railway_services').select('*'),
    sb.from('integration_do_apps').select('*'),
    sb.from('integration_supabase_projects').select('*'),
    // NAMES only — the index table never stores secret values.
    sb.from('integration_onepassword_index').select('vault, item_name, category'),
    sb
      .from('integration_linear_issues')
      .select('*')
      .neq('state_type', 'completed')
      .neq('state_type', 'canceled')
      .order('priority', { ascending: true }),
    sb
      .from('integration_stripe_invoices_mtd')
      .select('*')
      .order('yyyymm', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from('integration_composio_connections').select('*'),
  ]);

  return NextResponse.json(
    {
      sync: syncState.data ?? [],
      github: {
        repos: repos.data ?? [],
        openPRs: openPRs.data ?? [],
      },
      vercel: { projects: vercelProjects.data ?? [] },
      railway: { services: railwayServices.data ?? [] },
      digitalocean: { apps: doApps.data ?? [] },
      supabase: { projects: supabaseProjects.data ?? [] },
      onepassword: { index: opIndex.data ?? [] },
      linear: { openIssues: linearIssues.data ?? [] },
      stripe: { mtd: stripeMtd.data ?? null },
      composio: { connections: composio.data ?? [] },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
