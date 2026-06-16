import { getAdminClient } from '@/lib/supabase/admin';
import type { SyncRow } from '@/components/empire/IntegrationMatrix';

// Single source-of-truth for the empire/integrations dashboard data.
// Both the read endpoint (/api/empire/integrations) and the server-component
// page call this directly. Server-component → no fetch round-trip,
// no NEXTAUTH_URL dependency.
//
// Promise.allSettled means a single failing query (e.g. one missing table,
// one RLS denial) degrades gracefully: that section returns [] and the error
// is surfaced in _errors. The dashboard becomes a partial-state observer
// rather than a 500-or-nothing endpoint.

export interface IntegrationsState {
  sync: SyncRow[];
  github: { repos: unknown[]; openPRs: unknown[] };
  vercel: { projects: unknown[] };
  railway: { services: unknown[] };
  digitalocean: { apps: unknown[] };
  supabase: { projects: unknown[] };
  onepassword: { index: unknown[] };
  linear: { openIssues: unknown[] };
  stripe: { mtd: unknown };
  composio: { connections: unknown[] };
  _errors?: string[];
}

interface PgResult<T> {
  data: T | null;
  error: unknown;
}

function pick<T>(
  result: PromiseSettledResult<PgResult<T>>,
  label: string,
  errors: string[],
  fallback: T,
): T {
  if (result.status === 'rejected') {
    errors.push(`${label}: ${String(result.reason)}`);
    return fallback;
  }
  if (result.value.error) {
    errors.push(`${label}: ${String(result.value.error)}`);
    return fallback;
  }
  return (result.value.data ?? fallback) as T;
}

export async function getIntegrationsState(): Promise<IntegrationsState> {
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
  ] = await Promise.allSettled([
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

  const errors: string[] = [];

  const state: IntegrationsState = {
    sync: pick(syncState as PromiseSettledResult<PgResult<SyncRow[]>>, 'sync_state', errors, []),
    github: {
      repos: pick(repos as PromiseSettledResult<PgResult<unknown[]>>, 'github_repos', errors, []),
      openPRs: pick(openPRs as PromiseSettledResult<PgResult<unknown[]>>, 'github_prs', errors, []),
    },
    vercel: {
      projects: pick(
        vercelProjects as PromiseSettledResult<PgResult<unknown[]>>,
        'vercel_projects',
        errors,
        [],
      ),
    },
    railway: {
      services: pick(
        railwayServices as PromiseSettledResult<PgResult<unknown[]>>,
        'railway_services',
        errors,
        [],
      ),
    },
    digitalocean: {
      apps: pick(doApps as PromiseSettledResult<PgResult<unknown[]>>, 'do_apps', errors, []),
    },
    supabase: {
      projects: pick(
        supabaseProjects as PromiseSettledResult<PgResult<unknown[]>>,
        'supabase_projects',
        errors,
        [],
      ),
    },
    onepassword: {
      index: pick(opIndex as PromiseSettledResult<PgResult<unknown[]>>, 'onepassword_index', errors, []),
    },
    linear: {
      openIssues: pick(
        linearIssues as PromiseSettledResult<PgResult<unknown[]>>,
        'linear_issues',
        errors,
        [],
      ),
    },
    stripe: {
      mtd: pick(stripeMtd as PromiseSettledResult<PgResult<unknown>>, 'stripe_mtd', errors, null),
    },
    composio: {
      connections: pick(
        composio as PromiseSettledResult<PgResult<unknown[]>>,
        'composio_connections',
        errors,
        [],
      ),
    },
  };

  if (errors.length > 0) state._errors = errors;
  return state;
}
