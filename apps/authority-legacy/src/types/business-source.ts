// Pillar 3 (UNI-1947) — unified shape returned by every per-source adapter route.
//
// Each /api/empire/sources/<kind>/<slug> endpoint resolves to a BusinessSource
// describing the live state of one external system (GitHub repo, Vercel project,
// Linear team, etc.). The dashboard composes these into a single business-ops card.

export type SourceKind = 'github' | 'vercel' | 'railway' | 'supabase' | 'linear';

export type SourceStatus = 'ok' | 'warn' | 'err' | 'unknown';

export interface BusinessSource {
  source: SourceKind;
  status: SourceStatus;
  /** ISO 8601 UTC timestamp of the most recent meaningful event on the source.
   *  `null` when the source is unconfigured or unreachable. */
  last_update: string | null;
  /** Short, operator-facing description, e.g.
   *  "main · 12 open issues · last push 3d ago". */
  summary: string;
  /** Optional structured details — adapter-specific, not required by consumers. */
  details?: Record<string, unknown>;
  /** Deep link to the source in the upstream UI (GitHub repo page, Linear team, etc.). */
  url?: string;
  /** Present iff status === 'err' — short machine-readable error context. */
  error?: string;
}
