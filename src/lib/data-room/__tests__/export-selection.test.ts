// The ZIP export route selects per-kind: prefer the latest 'approved'
// document; fall back to the latest non-superseded; flag kinds with no
// candidate as missing. This logic lives in the route handler, but the
// selection algorithm is small and worth its own test.

interface Doc {
  id: string;
  kind: string;
  generated_at: string;
  audit_status: string;
}

const EXPECTED_KINDS = [
  'cohort_metrics',
  'pl_summary',
  'vendor_contracts',
  'ip_audit',
  'incident_timeline',
] as const;

type Kind = typeof EXPECTED_KINDS[number];

function selectForExport(docs: Doc[]) {
  const chosen: Partial<Record<Kind, Doc>> = {};
  const fallback: Partial<Record<Kind, Doc>> = {};
  const sorted = [...docs].sort((a, b) =>
    a.generated_at < b.generated_at ? 1 : a.generated_at > b.generated_at ? -1 : 0,
  );
  for (const doc of sorted) {
    const k = doc.kind as Kind;
    if (!EXPECTED_KINDS.includes(k)) continue;
    if (doc.audit_status === 'superseded') continue;
    if (doc.audit_status === 'approved') {
      if (!chosen[k]) chosen[k] = doc;
      // Once a kind has an approved doc, drop any earlier-recorded fallback
      // for it — the contract is that fallback only exists where chosen does not.
      delete fallback[k];
    } else if (!chosen[k] && !fallback[k]) {
      fallback[k] = doc;
    }
  }
  return { chosen, fallback };
}

describe('data-room export selection', () => {
  it('returns no docs when input is empty', () => {
    const { chosen, fallback } = selectForExport([]);
    expect(chosen).toEqual({});
    expect(fallback).toEqual({});
  });

  it('prefers the latest approved doc over older approved + non-approved', () => {
    const out = selectForExport([
      { id: 'a', kind: 'cohort_metrics', generated_at: '2026-05-01', audit_status: 'approved' },
      { id: 'b', kind: 'cohort_metrics', generated_at: '2026-05-10', audit_status: 'approved' },
      { id: 'c', kind: 'cohort_metrics', generated_at: '2026-05-15', audit_status: 'pending' },
    ]);
    expect(out.chosen.cohort_metrics?.id).toBe('b');
    expect(out.fallback.cohort_metrics).toBeUndefined();
  });

  it('falls back to the latest non-superseded doc when no approval exists', () => {
    const out = selectForExport([
      { id: 'a', kind: 'pl_summary', generated_at: '2026-05-01', audit_status: 'pending' },
      { id: 'b', kind: 'pl_summary', generated_at: '2026-05-15', audit_status: 'pending' },
    ]);
    expect(out.chosen.pl_summary).toBeUndefined();
    expect(out.fallback.pl_summary?.id).toBe('b');
  });

  it('never selects a superseded doc, even when it is the only one', () => {
    const out = selectForExport([
      { id: 'a', kind: 'ip_audit', generated_at: '2026-05-01', audit_status: 'superseded' },
    ]);
    expect(out.chosen.ip_audit).toBeUndefined();
    expect(out.fallback.ip_audit).toBeUndefined();
  });

  it('treats each kind independently', () => {
    const out = selectForExport([
      { id: 'a', kind: 'cohort_metrics', generated_at: '2026-05-15', audit_status: 'approved' },
      { id: 'b', kind: 'pl_summary', generated_at: '2026-05-10', audit_status: 'pending' },
      { id: 'c', kind: 'vendor_contracts', generated_at: '2026-05-12', audit_status: 'rejected' },
    ]);
    expect(out.chosen.cohort_metrics?.id).toBe('a');
    expect(out.fallback.pl_summary?.id).toBe('b');
    expect(out.fallback.vendor_contracts?.id).toBe('c');
  });

  it('ignores rows of unrecognised kind', () => {
    const out = selectForExport([
      // @ts-expect-error — testing runtime filter
      { id: 'x', kind: 'mystery_kind', generated_at: '2026-05-15', audit_status: 'approved' },
    ]);
    expect(out.chosen).toEqual({});
    expect(out.fallback).toEqual({});
  });
});
