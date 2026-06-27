// activity-data.ts — type + empty default for the Zone 5 activity feed.
//
// The legacy Authority cockpit shipped a large hand-curated seed of fabricated
// events. That violates the No-Invaders "no fake-as-real" rule once mounted in
// the founder app, where there is no live agent_actions source wired yet. So
// the default export here is an EMPTY array: ActivityLog renders an honest
// "0 events" with a `seed` SourceBadge until a caller passes live `events` +
// `sourceLiveAt` from a real source.

export type ActivitySeverity = 'running' | 'signal' | 'hush'

// Where the agent sourced/acted — the "sourcing information" dimension. Kept a
// small closed enum so a row can never invent a rogue origin:
//   - 'linear'   — work tracked in / synced to a Linear issue.
//   - 'github'   — a commit, branch or PR on GitHub.
//   - 'evidence' — backed by an evidence record / wiki note in this repo.
//   - 'provider' — an external integration (Xero, Stripe, Gmail, …).
//   - 'cc'       — internal Command Centre task, no external system of record.
export type ActivityOrigin = 'linear' | 'github' | 'evidence' | 'provider' | 'cc'

export interface ActivityDatum {
  id: string
  ts: string
  agent: string
  verb: string
  target: string
  severity: ActivitySeverity
  /** Where the agent sourced/acted — rendered as a small source chip. */
  origin: ActivityOrigin
  /** Optional external link (GitHub commit, Linear ticket, Stripe dashboard). */
  url?: string
}

// Empty by default — no fabricated activity. Live wiring passes `events`.
export const ACTIVITY_DATA: ActivityDatum[] = []
