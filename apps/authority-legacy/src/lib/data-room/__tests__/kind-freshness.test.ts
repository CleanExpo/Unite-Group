import {
  FRESHNESS_STALE_DAYS,
  computeKindFreshness,
  type FreshnessInputDoc,
} from '../kind-freshness';
import { ALL_GENERATOR_KINDS } from '../run-all-generators';

const AS_OF = '2026-05-18T00:00:00.000Z';
const asOfMs = Date.parse(AS_OF);

function daysAgo(days: number): string {
  return new Date(asOfMs - days * 86_400_000).toISOString();
}

function doc(overrides: Partial<FreshnessInputDoc> = {}): FreshnessInputDoc {
  return {
    kind: 'cohort_metrics',
    generated_at: daysAgo(1),
    audit_status: 'pending',
    id: 'doc_test',
    ...overrides,
  };
}

describe('computeKindFreshness', () => {
  it('returns one entry per generator kind even with empty input', () => {
    const out = computeKindFreshness([], AS_OF);
    expect(out.map((r) => r.kind).sort()).toEqual([...ALL_GENERATOR_KINDS].sort());
    expect(out.every((r) => r.status === 'missing')).toBe(true);
    expect(out.every((r) => r.latest_doc_id === null)).toBe(true);
  });

  it('flags a kind as missing when only superseded docs exist', () => {
    const out = computeKindFreshness(
      [doc({ kind: 'pl_summary', audit_status: 'superseded' })],
      AS_OF,
    );
    expect(out.find((r) => r.kind === 'pl_summary')?.status).toBe('missing');
  });

  it('prefers approved over pending and rejected for the same kind', () => {
    const out = computeKindFreshness(
      [
        doc({ id: 'a', kind: 'ip_audit', audit_status: 'pending', generated_at: daysAgo(2) }),
        doc({ id: 'b', kind: 'ip_audit', audit_status: 'approved', generated_at: daysAgo(5) }),
        doc({ id: 'c', kind: 'ip_audit', audit_status: 'rejected', generated_at: daysAgo(1) }),
      ],
      AS_OF,
    );
    expect(out.find((r) => r.kind === 'ip_audit')?.status).toBe('approved');
  });

  it('drops to pending when no approved doc exists', () => {
    const out = computeKindFreshness(
      [
        doc({ kind: 'vendor_contracts', audit_status: 'pending', generated_at: daysAgo(1) }),
        doc({ kind: 'vendor_contracts', audit_status: 'rejected', generated_at: daysAgo(2) }),
      ],
      AS_OF,
    );
    expect(out.find((r) => r.kind === 'vendor_contracts')?.status).toBe('pending');
  });

  it('falls through to rejected when only rejected non-superseded docs exist', () => {
    const out = computeKindFreshness(
      [doc({ kind: 'incident_timeline', audit_status: 'rejected' })],
      AS_OF,
    );
    expect(out.find((r) => r.kind === 'incident_timeline')?.status).toBe('rejected');
  });

  it('exposes latest_doc_id and generated_at from the newest non-superseded doc', () => {
    const out = computeKindFreshness(
      [
        doc({ id: 'old', generated_at: daysAgo(10), audit_status: 'pending' }),
        doc({ id: 'mid', generated_at: daysAgo(5), audit_status: 'pending' }),
        doc({ id: 'fresh', generated_at: daysAgo(1), audit_status: 'pending' }),
      ],
      AS_OF,
    );
    const cohort = out.find((r) => r.kind === 'cohort_metrics')!;
    expect(cohort.latest_doc_id).toBe('fresh');
    expect(cohort.latest_generated_at).toBe(daysAgo(1));
    expect(cohort.days_since_generated).toBe(1);
  });

  it('treats latest doc as the freshness signal even when a superseded doc is newer', () => {
    // Edge case: regeneration that race-conditioned. The newest doc has
    // status 'superseded' (already replaced); the prior pending is what
    // the operator should see.
    const out = computeKindFreshness(
      [
        doc({ id: 'pending_doc', generated_at: daysAgo(2), audit_status: 'pending' }),
        doc({ id: 'superseded_doc', generated_at: daysAgo(1), audit_status: 'superseded' }),
      ],
      AS_OF,
    );
    const cohort = out.find((r) => r.kind === 'cohort_metrics')!;
    expect(cohort.latest_doc_id).toBe('pending_doc');
    expect(cohort.status).toBe('pending');
  });

  it('marks is_stale=true when days_since_generated > 7', () => {
    const fresh = computeKindFreshness(
      [doc({ kind: 'cohort_metrics', generated_at: daysAgo(FRESHNESS_STALE_DAYS) })],
      AS_OF,
    );
    expect(fresh.find((r) => r.kind === 'cohort_metrics')?.is_stale).toBe(false);

    const stale = computeKindFreshness(
      [doc({ kind: 'cohort_metrics', generated_at: daysAgo(FRESHNESS_STALE_DAYS + 1) })],
      AS_OF,
    );
    expect(stale.find((r) => r.kind === 'cohort_metrics')?.is_stale).toBe(true);
  });

  it('returns days_since_generated=null and is_stale=false for missing kinds', () => {
    const out = computeKindFreshness([], AS_OF);
    expect(out.every((r) => r.days_since_generated === null)).toBe(true);
    expect(out.every((r) => r.is_stale === false)).toBe(true);
  });
});
