import {
  buildCohortMetrics,
  type HealthSnapshotRow,
} from '../cohort-metrics';

const AS_OF = '2026-05-18T00:00:00.000Z';
const asOfMs = Date.parse(AS_OF);

function snapshot(
  project: string,
  daysAgo: number,
  overrides: Partial<HealthSnapshotRow> = {},
): HealthSnapshotRow {
  return {
    project_id: project,
    overall_health: 80,
    security_score: 85,
    security_findings: 0,
    dependencies: 0,
    snapshot_at: new Date(asOfMs - daysAgo * 86_400_000).toISOString(),
    ...overrides,
  };
}

describe('buildCohortMetrics', () => {
  it('returns an empty per_business list when there are no snapshots', () => {
    const out = buildCohortMetrics([], AS_OF);
    expect(out.business_count).toBe(0);
    expect(out.per_business).toEqual([]);
    expect(out.as_of).toBe(AS_OF);
  });

  it('groups snapshots by project and reports latest_snapshot_at', () => {
    const out = buildCohortMetrics(
      [
        snapshot('a', 10),
        snapshot('a', 5),
        snapshot('b', 2),
      ],
      AS_OF,
    );
    expect(out.business_count).toBe(2);
    const a = out.per_business.find((p) => p.project_id === 'a')!;
    const b = out.per_business.find((p) => p.project_id === 'b')!;
    expect(a.latest_snapshot_at).toBe(snapshot('a', 5).snapshot_at);
    expect(b.latest_snapshot_at).toBe(snapshot('b', 2).snapshot_at);
  });

  it('confines each window to its day range', () => {
    const out = buildCohortMetrics(
      [
        // Inside 90d window
        snapshot('a', 30, { overall_health: 70 }),
        // Inside 180d (and 365d) but NOT 90d
        snapshot('a', 120, { overall_health: 60 }),
        // Inside 365d only
        snapshot('a', 300, { overall_health: 50 }),
        // Older than 365d — must be excluded everywhere
        snapshot('a', 500, { overall_health: 10 }),
      ],
      AS_OF,
    );
    const a = out.per_business[0];
    expect(a.windows[90].sample_count).toBe(1);
    expect(a.windows[180].sample_count).toBe(2);
    expect(a.windows[365].sample_count).toBe(3);
    expect(a.windows[365].avg_health).toBe(60);
  });

  it('flags insufficient_data when fewer than 2 health values in the window', () => {
    const out = buildCohortMetrics([snapshot('a', 5)], AS_OF);
    expect(out.per_business[0].windows[90].trend).toBe('insufficient_data');
  });

  it('detects improving / flat / declining trend over the window', () => {
    const out = buildCohortMetrics(
      [
        snapshot('improving', 80, { overall_health: 60 }),
        snapshot('improving', 40, { overall_health: 60 }),
        snapshot('improving', 10, { overall_health: 80 }),
        snapshot('improving', 5,  { overall_health: 85 }),

        snapshot('flat', 80, { overall_health: 70 }),
        snapshot('flat', 40, { overall_health: 70 }),
        snapshot('flat', 10, { overall_health: 70 }),
        snapshot('flat', 5,  { overall_health: 71 }),

        snapshot('declining', 80, { overall_health: 90 }),
        snapshot('declining', 40, { overall_health: 88 }),
        snapshot('declining', 10, { overall_health: 70 }),
        snapshot('declining', 5,  { overall_health: 60 }),
      ],
      AS_OF,
    );
    const trend = (id: string) =>
      out.per_business.find((p) => p.project_id === id)!.windows[90].trend;
    expect(trend('improving')).toBe('improving');
    expect(trend('flat')).toBe('flat');
    expect(trend('declining')).toBe('declining');
  });

  it('sums security_findings (number | array | {count})', () => {
    const out = buildCohortMetrics(
      [
        snapshot('a', 10, { security_findings: 3 }),
        snapshot('a', 5, { security_findings: [{ severity: 'low' }, { severity: 'high' }] }),
        snapshot('a', 2, { security_findings: { count: 7 } }),
        snapshot('a', 1, { security_findings: 'garbage' as unknown }),
      ],
      AS_OF,
    );
    expect(out.per_business[0].windows[90].security_findings_total).toBe(3 + 2 + 7 + 0);
  });

  it('reports the max dependency_count over the window', () => {
    const out = buildCohortMetrics(
      [
        snapshot('a', 10, { dependencies: 42 }),
        snapshot('a', 5, { dependencies: { count: 50 } }),
        snapshot('a', 2, { dependencies: 38 }),
      ],
      AS_OF,
    );
    expect(out.per_business[0].windows[90].dependency_count).toBe(50);
  });

  it('rounds avg_health to 2 decimal places', () => {
    const out = buildCohortMetrics(
      [
        snapshot('a', 10, { overall_health: 80 }),
        snapshot('a', 5, { overall_health: 83 }),
        snapshot('a', 2, { overall_health: 85 }),
      ],
      AS_OF,
    );
    // (80+83+85)/3 = 82.6666... → 82.67
    expect(out.per_business[0].windows[90].avg_health).toBe(82.67);
  });

  it('ignores null overall_health when averaging but still counts the row', () => {
    const out = buildCohortMetrics(
      [
        snapshot('a', 10, { overall_health: 80 }),
        snapshot('a', 5, { overall_health: null }),
        snapshot('a', 2, { overall_health: 90 }),
      ],
      AS_OF,
    );
    expect(out.per_business[0].windows[90].sample_count).toBe(3);
    expect(out.per_business[0].windows[90].avg_health).toBe(85);
  });
});
