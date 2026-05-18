import {
  buildIpAudit,
  type GitHubRepoRow,
  type TrademarkRecord,
} from '../ip-audit';

const AS_OF = '2026-05-18T00:00:00.000Z';

function repo(
  overrides: Partial<GitHubRepoRow> = {},
): GitHubRepoRow {
  return {
    id: 'CleanExpo/Test',
    name: 'Test',
    owner: 'CleanExpo',
    default_branch: 'main',
    is_private: false,
    last_pushed_at: '2026-05-17T00:00:00.000Z',
    open_prs_count: 0,
    open_issues_count: 0,
    ...overrides,
  };
}

function trademark(
  overrides: Partial<TrademarkRecord> = {},
): TrademarkRecord {
  return {
    business_slug: 'unite-group',
    mark: 'UNITE GROUP',
    class: '42',
    status: 'registered',
    jurisdiction: 'AU',
    registered_at: '2025-01-15',
    ...overrides,
  };
}

describe('buildIpAudit', () => {
  it('returns an empty audit with no sources', () => {
    const out = buildIpAudit([], [], AS_OF);
    expect(out.repo_count).toBe(0);
    expect(out.trademark_count).toBe(0);
    expect(out.sources_missing).toContain('github_repos');
    expect(out.sources_missing).toContain('supabase_trademarks');
    expect(out.sources_present).toEqual([]);
  });

  it('flags github_repos present + supabase_trademarks missing when only repos arrive', () => {
    const out = buildIpAudit([repo()], [], AS_OF);
    expect(out.sources_present).toEqual(['github_repos']);
    expect(out.sources_missing).toEqual(['supabase_trademarks']);
  });

  it('flags supabase_trademarks present + github_repos missing when only trademarks arrive', () => {
    const out = buildIpAudit([], [trademark()], AS_OF);
    expect(out.sources_present).toEqual(['supabase_trademarks']);
    expect(out.sources_missing).toEqual(['github_repos']);
  });

  it('counts private vs public repos correctly', () => {
    const out = buildIpAudit(
      [
        repo({ id: 'CleanExpo/p1', is_private: true }),
        repo({ id: 'CleanExpo/p2', is_private: true }),
        repo({ id: 'CleanExpo/o1', is_private: false }),
        repo({ id: 'CleanExpo/u1', is_private: null }),
      ],
      [],
      AS_OF,
    );
    expect(out.repo_count).toBe(4);
    expect(out.private_repo_count).toBe(2);
    expect(out.public_repo_count).toBe(1);
  });

  it('maps is_private=null to visibility="unknown"', () => {
    const out = buildIpAudit(
      [repo({ id: 'CleanExpo/u', is_private: null })],
      [],
      AS_OF,
    );
    expect(out.repos[0].visibility).toBe('unknown');
  });

  it('computes staleness_days from last_pushed_at vs as_of', () => {
    // 7 days before AS_OF
    const sevenDaysAgo = '2026-05-11T00:00:00.000Z';
    const out = buildIpAudit(
      [repo({ id: 'CleanExpo/a', last_pushed_at: sevenDaysAgo })],
      [],
      AS_OF,
    );
    expect(out.repos[0].staleness_days).toBe(7);
  });

  it('reports staleness_days=null when last_pushed_at is null', () => {
    const out = buildIpAudit(
      [repo({ id: 'CleanExpo/never', last_pushed_at: null })],
      [],
      AS_OF,
    );
    expect(out.repos[0].staleness_days).toBeNull();
  });

  it('sorts never-pushed first, then freshest first', () => {
    const out = buildIpAudit(
      [
        repo({ id: 'CleanExpo/old', last_pushed_at: '2025-01-01T00:00:00.000Z' }),
        repo({ id: 'CleanExpo/fresh', last_pushed_at: '2026-05-17T00:00:00.000Z' }),
        repo({ id: 'CleanExpo/never', last_pushed_at: null }),
        repo({ id: 'CleanExpo/mid', last_pushed_at: '2026-03-01T00:00:00.000Z' }),
      ],
      [],
      AS_OF,
    );
    expect(out.repos.map((r) => r.full_name)).toEqual([
      'CleanExpo/never',
      'CleanExpo/fresh',
      'CleanExpo/mid',
      'CleanExpo/old',
    ]);
  });

  it('defaults missing open counts to 0', () => {
    const out = buildIpAudit(
      [repo({ open_prs_count: null, open_issues_count: null })],
      [],
      AS_OF,
    );
    expect(out.repos[0].open_prs_count).toBe(0);
    expect(out.repos[0].open_issues_count).toBe(0);
  });

  it('passes trademarks through unchanged', () => {
    const tm = trademark({ mark: 'CCW', class: '37' });
    const out = buildIpAudit([], [tm], AS_OF);
    expect(out.trademark_count).toBe(1);
    expect(out.trademarks[0]).toEqual(tm);
  });
});
