// activity-data.ts — static seed of 30 recent events for Zone 5.
//
// Hand-curated so the eye sees real shape — mix of agent dispatches, PR
// activity, Stripe events, Margot synthesis, scheduled-task ticks. Live
// wiring deferred (binds to /api/pi-ceo/activity per the redesign proposal).
//
// Each event:
//   - id              — stable react key
//   - ts              — ISO timestamp
//   - agent           — short uppercase label, mono ("MARGOT", "HERMES",
//                       "STRIPE", "GITHUB", "BOARD")
//   - verb            — action verb, hush ink ("opened", "dispatched",
//                       "synthesised", "merged")
//   - target          — what got actioned, primary ink
//   - severity        — running | signal | hush (single-accent rule)

export type ActivitySeverity = 'running' | 'signal' | 'hush';

export interface ActivityDatum {
  id: string;
  ts: string;
  agent: string;
  verb: string;
  target: string;
  severity: ActivitySeverity;
}

// Newest first — Zone 5 renders reverse-chrono and shows top 20.
export const ACTIVITY_DATA: ActivityDatum[] = [
  {
    id: 'a30',
    ts: '2026-05-14T22:18:00Z',
    agent: 'MARGOT',
    verb: 'dispatched',
    target: 'pm-core → RA-3013 rate-limit guard',
    severity: 'running',
  },
  {
    id: 'a29',
    ts: '2026-05-14T22:16:00Z',
    agent: 'GITHUB',
    verb: 'opened',
    target: 'PR feat/command-center-pr3-zones4-5',
    severity: 'running',
  },
  {
    id: 'a28',
    ts: '2026-05-14T22:12:00Z',
    agent: 'BOARD',
    verb: 'synthesised',
    target: 'Duncan Day-14 demo-reel scope memo',
    severity: 'running',
  },
  {
    id: 'a27',
    ts: '2026-05-14T22:08:00Z',
    agent: 'HERMES',
    verb: 'tick',
    target: 'wiki-ingest cron · 14 pages updated',
    severity: 'hush',
  },
  {
    id: 'a26',
    ts: '2026-05-14T22:02:00Z',
    agent: 'STRIPE',
    verb: 'received',
    target: 'webhook · invoice.draft Duncan-M2',
    severity: 'running',
  },
  {
    id: 'a25',
    ts: '2026-05-14T21:54:00Z',
    agent: 'PM-CORE',
    verb: 'claimed',
    target: 'RA-3013 multi-tenant audit ticket',
    severity: 'running',
  },
  {
    id: 'a24',
    ts: '2026-05-14T21:48:00Z',
    agent: 'MARGOT',
    verb: 'synthesised',
    target: 'CCW-CRM data-room redaction memo',
    severity: 'running',
  },
  {
    id: 'a23',
    ts: '2026-05-14T21:40:00Z',
    agent: 'GITHUB',
    verb: 'merged',
    target: 'security/ra-3008-multi-tenant-audit',
    severity: 'running',
  },
  {
    id: 'a22',
    ts: '2026-05-14T21:32:00Z',
    agent: 'STRIPE',
    verb: 'cleared',
    target: 'deposit · Duncan · $4,400 AUD',
    severity: 'running',
  },
  {
    id: 'a21',
    ts: '2026-05-14T21:24:00Z',
    agent: 'BOARD',
    verb: 'blocked',
    target: 'CCW outreach · Toby holiday window',
    severity: 'signal',
  },
  {
    id: 'a20',
    ts: '2026-05-14T21:18:00Z',
    agent: 'HERMES',
    verb: 'dispatched',
    target: 'remotion-orchestrator · DR explainer 30s',
    severity: 'running',
  },
  {
    id: 'a19',
    ts: '2026-05-14T21:12:00Z',
    agent: 'MARGOT',
    verb: 'queued',
    target: 'deep-research · ATIA citation moat',
    severity: 'running',
  },
  {
    id: 'a18',
    ts: '2026-05-14T21:04:00Z',
    agent: 'GITHUB',
    verb: 'opened',
    target: 'PR feat/contextbot-platform · phase-4',
    severity: 'running',
  },
  {
    id: 'a17',
    ts: '2026-05-14T20:58:00Z',
    agent: 'CONTEXTBOT',
    verb: 'paired',
    target: 'Duncan · @duncan_perkins',
    severity: 'running',
  },
  {
    id: 'a16',
    ts: '2026-05-14T20:50:00Z',
    agent: 'HERMES',
    verb: 'tick',
    target: 'gsc-weekly-review cron · 6 brands',
    severity: 'hush',
  },
  {
    id: 'a15',
    ts: '2026-05-14T20:42:00Z',
    agent: 'BOARD',
    verb: 'decision',
    target: 'Recall.ai > Otter · 2026-05-14 logged',
    severity: 'running',
  },
  {
    id: 'a14',
    ts: '2026-05-14T20:36:00Z',
    agent: 'STRIPE',
    verb: 'drafted',
    target: 'invoice · Duncan-M2 · $4,400 AUD',
    severity: 'running',
  },
  {
    id: 'a13',
    ts: '2026-05-14T20:28:00Z',
    agent: 'MARGOT',
    verb: 'aligned',
    target: 'corpus · 47 wiki pages reindexed',
    severity: 'hush',
  },
  {
    id: 'a12',
    ts: '2026-05-14T20:20:00Z',
    agent: 'GITHUB',
    verb: 'green',
    target: 'CI · feat/duncan-foundations · pass',
    severity: 'running',
  },
  {
    id: 'a11',
    ts: '2026-05-14T20:14:00Z',
    agent: 'PM-CORE',
    verb: 'shipped',
    target: 'RA-2999 husky pre-push type-check',
    severity: 'running',
  },
  {
    id: 'a10',
    ts: '2026-05-14T20:06:00Z',
    agent: 'HERMES',
    verb: 'dispatched',
    target: 'video-director · RA explainer brief',
    severity: 'running',
  },
  {
    id: 'a09',
    ts: '2026-05-14T19:58:00Z',
    agent: 'BOARD',
    verb: 'synthesised',
    target: 'PR-1 command-center foundations review',
    severity: 'running',
  },
  {
    id: 'a08',
    ts: '2026-05-14T19:50:00Z',
    agent: 'STRIPE',
    verb: 'received',
    target: 'webhook · payment_intent.succeeded',
    severity: 'running',
  },
  {
    id: 'a07',
    ts: '2026-05-14T19:42:00Z',
    agent: 'MARGOT',
    verb: 'briefed',
    target: 'sow-draft skill · Duncan ITR platform',
    severity: 'running',
  },
  {
    id: 'a06',
    ts: '2026-05-14T19:34:00Z',
    agent: 'GITHUB',
    verb: 'opened',
    target: 'PR ci/ra-2999-husky-pre-push-type-check',
    severity: 'running',
  },
  {
    id: 'a05',
    ts: '2026-05-14T19:26:00Z',
    agent: 'CONTEXTBOT',
    verb: 'intake',
    target: 'CCW · weekend portal screenshot',
    severity: 'running',
  },
  {
    id: 'a04',
    ts: '2026-05-14T19:18:00Z',
    agent: 'HERMES',
    verb: 'tick',
    target: 'local-seo-mon-0900 cron · 6 brands',
    severity: 'hush',
  },
  {
    id: 'a03',
    ts: '2026-05-14T19:10:00Z',
    agent: 'BOARD',
    verb: 'decision',
    target: 'stay-on-anthropic-through-Q2-2027 logged',
    severity: 'running',
  },
  {
    id: 'a02',
    ts: '2026-05-14T19:02:00Z',
    agent: 'MARGOT',
    verb: 'lint',
    target: 'wiki · 0 contradictions · 2 stale flagged',
    severity: 'hush',
  },
  {
    id: 'a01',
    ts: '2026-05-14T18:54:00Z',
    agent: 'GITHUB',
    verb: 'green',
    target: 'CI · main · build #4421 pass',
    severity: 'running',
  },
];
