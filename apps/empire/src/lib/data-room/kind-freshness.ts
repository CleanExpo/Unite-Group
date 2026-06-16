// Per-kind freshness summary for the DataRoom admin UI.
//
// Pure function: given the current data_room_documents list and the "as-of"
// timestamp, return a per-kind status the UI can render at a glance.
//
// Status precedence (highest wins per kind):
//   approved   — at least one non-superseded approved doc exists
//   pending    — no approved doc, but at least one pending doc exists
//   rejected   — only rejected docs exist (no pending, no approved)
//   missing    — no docs of this kind exist at all
//
// Independent of status, we also compute days_since_generated using the
// latest non-superseded doc's generated_at — that's the freshness signal
// the founder needs. Stale threshold: 7 days.

import { ALL_GENERATOR_KINDS, type GeneratorKind } from './run-all-generators';

export const FRESHNESS_STALE_DAYS = 7;

export type FreshnessStatus = 'approved' | 'pending' | 'rejected' | 'missing';

export interface KindFreshness {
  kind: GeneratorKind;
  status: FreshnessStatus;
  latest_doc_id: string | null;
  latest_generated_at: string | null;
  days_since_generated: number | null;
  is_stale: boolean;
}

export interface FreshnessInputDoc {
  kind: string;
  generated_at: string;
  audit_status: string;
  id?: string;
}

export function computeKindFreshness(
  docs: FreshnessInputDoc[],
  asOf: string,
): KindFreshness[] {
  const asOfMs = Date.parse(asOf);
  const byKind = new Map<string, FreshnessInputDoc[]>();
  for (const doc of docs) {
    const list = byKind.get(doc.kind) ?? [];
    list.push(doc);
    byKind.set(doc.kind, list);
  }

  return ALL_GENERATOR_KINDS.map((kind) => {
    const rows = byKind.get(kind) ?? [];
    const nonSuperseded = rows.filter((r) => r.audit_status !== 'superseded');

    if (nonSuperseded.length === 0) {
      return {
        kind,
        status: 'missing' as const,
        latest_doc_id: null,
        latest_generated_at: null,
        days_since_generated: null,
        is_stale: false,
      };
    }

    const sorted = [...nonSuperseded].sort((a, b) =>
      a.generated_at < b.generated_at ? 1 : a.generated_at > b.generated_at ? -1 : 0,
    );
    const latest = sorted[0];
    const generatedMs = Date.parse(latest.generated_at);
    const days = Number.isFinite(generatedMs)
      ? Math.max(0, Math.floor((asOfMs - generatedMs) / 86_400_000))
      : null;

    const hasApproved = nonSuperseded.some((r) => r.audit_status === 'approved');
    const hasPending = nonSuperseded.some((r) => r.audit_status === 'pending');
    const status: FreshnessStatus = hasApproved
      ? 'approved'
      : hasPending
        ? 'pending'
        : 'rejected';

    return {
      kind,
      status,
      latest_doc_id: latest.id ?? null,
      latest_generated_at: latest.generated_at,
      days_since_generated: days,
      is_stale: days !== null && days > FRESHNESS_STALE_DAYS,
    };
  });
}
