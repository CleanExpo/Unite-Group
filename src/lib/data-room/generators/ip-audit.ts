// IP audit generator (UNI-1987, DataRoom 5/7).
//
// Two ticket-spec'd inputs:
//   1. GitHub repos — public.integration_github_repos. Live.
//   2. Registered trademarks — businesses.metadata.trademarks. The
//      metadata column does NOT exist yet. Until a manual seed lands or
//      Phill adds the column, trademarks come back empty and the payload
//      declares supabase_trademarks in `sources_missing`.
//
// Pure function: no I/O. The route does the Supabase reads + insert.

export interface GitHubRepoRow {
  id: string;                    // 'CleanExpo/RestoreAssist'
  name: string;
  owner: string;
  default_branch: string | null;
  is_private: boolean | null;
  last_pushed_at: string | null;
  open_prs_count: number | null;
  open_issues_count: number | null;
}

export interface TrademarkRecord {
  business_slug: string | null;
  mark: string;
  class: string | null;
  status: 'registered' | 'pending' | 'lapsed' | 'unknown';
  jurisdiction: string | null;
  registered_at: string | null;
}

export type IpAuditSource = 'github_repos' | 'supabase_trademarks';

export interface IpAuditRepoRecord {
  full_name: string;
  name: string;
  owner: string;
  visibility: 'public' | 'private' | 'unknown';
  default_branch: string | null;
  last_pushed_at: string | null;
  open_prs_count: number;
  open_issues_count: number;
  /** Days since last push, or null if unknown. */
  staleness_days: number | null;
}

export interface IpAuditPayload {
  generated_at: string;
  as_of: string;
  repo_count: number;
  private_repo_count: number;
  public_repo_count: number;
  trademark_count: number;
  sources_present: IpAuditSource[];
  sources_missing: IpAuditSource[];
  repos: IpAuditRepoRecord[];
  trademarks: TrademarkRecord[];
}

export function buildIpAudit(
  repos: GitHubRepoRow[],
  trademarks: TrademarkRecord[],
  asOf: string,
): IpAuditPayload {
  const sourcesPresent: IpAuditSource[] = [];
  const sourcesMissing: IpAuditSource[] = [];

  if (repos.length > 0) {
    sourcesPresent.push('github_repos');
  } else {
    sourcesMissing.push('github_repos');
  }
  if (trademarks.length > 0) {
    sourcesPresent.push('supabase_trademarks');
  } else {
    sourcesMissing.push('supabase_trademarks');
  }

  const asOfMs = Date.parse(asOf);

  const repoRecords: IpAuditRepoRecord[] = repos.map((r) => {
    const lastPushedMs = r.last_pushed_at ? Date.parse(r.last_pushed_at) : NaN;
    const staleness_days = Number.isFinite(lastPushedMs)
      ? Math.max(0, Math.floor((asOfMs - lastPushedMs) / 86_400_000))
      : null;
    return {
      full_name: r.id,
      name: r.name,
      owner: r.owner,
      visibility: r.is_private === true ? 'private' : r.is_private === false ? 'public' : 'unknown',
      default_branch: r.default_branch,
      last_pushed_at: r.last_pushed_at,
      open_prs_count: r.open_prs_count ?? 0,
      open_issues_count: r.open_issues_count ?? 0,
      staleness_days,
    };
  });

  // Sort: never-pushed first (operator needs to see them), then freshest first.
  repoRecords.sort((a, b) => {
    if (a.staleness_days === null && b.staleness_days === null) return 0;
    if (a.staleness_days === null) return -1;
    if (b.staleness_days === null) return 1;
    return a.staleness_days - b.staleness_days;
  });

  const privateCount = repoRecords.filter((r) => r.visibility === 'private').length;
  const publicCount = repoRecords.filter((r) => r.visibility === 'public').length;

  return {
    generated_at: asOf,
    as_of: asOf,
    repo_count: repoRecords.length,
    private_repo_count: privateCount,
    public_repo_count: publicCount,
    trademark_count: trademarks.length,
    sources_present: sourcesPresent,
    sources_missing: sourcesMissing,
    repos: repoRecords,
    trademarks,
  };
}
