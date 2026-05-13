// UNI-1948 — Reusable Supabase Management advisors helper.
//
// Returns the count of actionable (ERROR + WARN) lints from the security and
// performance advisor endpoints. Both endpoints are best-effort: if either one
// 4xxs or 5xxs, that count comes back as `null` rather than poisoning the rest
// of the snapshot.
//
// Used by BOTH:
//   - /api/empire/sources/supabase/[slug]/route.ts  (adapter)
//   - /api/cron/process-scan-requests/route.ts      (scanner)
//
// NO MOCK DATA. Throws when the access token is missing or the projects/{ref}
// lookup fails — the caller decides how to record the failure honestly.

const SUPABASE_MGMT_API = 'https://api.supabase.com';
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'unite-group-empire';

export interface SupabaseAdvisors {
  /** Count of ERROR+WARN security lints, or null when the endpoint failed. */
  security_count: number | null;
  /** Count of ERROR+WARN performance lints, or null when the endpoint failed. */
  performance_count: number | null;
  /** Live project status (e.g. ACTIVE_HEALTHY, COMING_UP, INACTIVE). */
  project_status: string;
  /** Project region as reported by the API. */
  region: string;
  /** Human-readable project name. */
  project_name: string;
  /** Project created_at as reported by the API, when present. */
  created_at: string | null;
}

interface SupabaseProjectResponse {
  id: string;
  name: string;
  region: string;
  status: string;
  created_at?: string;
}

interface SupabaseLintsResponse {
  lints?: Array<{
    level: 'ERROR' | 'WARN' | 'INFO' | string;
  }>;
}

interface MgmtOk<T> { ok: true; data: T }
interface MgmtErr { ok: false; status: number; body: string }
type MgmtFetch<T> = MgmtOk<T> | MgmtErr;

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

function countActionable(payload: MgmtFetch<SupabaseLintsResponse>): number | null {
  if (!payload.ok) return null;
  const lints = payload.data.lints ?? [];
  return lints.filter((l) => l.level === 'ERROR' || l.level === 'WARN').length;
}

/**
 * Fetch Supabase advisors for a project ref. Throws on missing token or
 * a project-lookup failure; advisors degrade to null on per-endpoint errors.
 */
export async function fetchSupabaseAdvisors(projectRef: string): Promise<SupabaseAdvisors> {
  if (!projectRef || projectRef.trim().length === 0) {
    throw new Error('projectRef is required');
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token || token.trim().length === 0) {
    throw new Error('SUPABASE_ACCESS_TOKEN missing');
  }

  const projectRes = await mgmtFetch<SupabaseProjectResponse>(
    `${SUPABASE_MGMT_API}/v1/projects/${projectRef}`,
    token.trim()
  );

  if (!projectRes.ok) {
    throw new Error(`Supabase project ${projectRes.status}: ${projectRes.body.slice(0, 100)}`);
  }

  const [secRes, perfRes] = await Promise.all([
    mgmtFetch<SupabaseLintsResponse>(
      `${SUPABASE_MGMT_API}/v1/projects/${projectRef}/advisors/security`,
      token.trim()
    ),
    mgmtFetch<SupabaseLintsResponse>(
      `${SUPABASE_MGMT_API}/v1/projects/${projectRef}/advisors/performance`,
      token.trim()
    ),
  ]);

  return {
    security_count: countActionable(secRes),
    performance_count: countActionable(perfRes),
    project_status: projectRes.data.status,
    region: projectRes.data.region,
    project_name: projectRes.data.name,
    created_at: projectRes.data.created_at ?? null,
  };
}
