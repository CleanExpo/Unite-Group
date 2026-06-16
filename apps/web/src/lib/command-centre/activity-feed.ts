// src/lib/command-centre/activity-feed.ts
//
// UNI-2137 — pure derivation of the Command Centre activity feed from the
// founder's real cc_tasks. Closes the "sourcing information" gap on the agent
// activity dashboard: every row carries an `origin` describing WHERE the agent
// sourced/acted (Linear, GitHub, an evidence note, an external provider, or an
// internal CC task), and an optional external `url` to jump straight to it.
//
// SAFETY / honesty:
//  - Pure function — no I/O, no wall-clock. The caller passes `now` via opts so
//    the output is deterministic and unit-testable (matching the pattern used
//    by live-agent-operations.ts and work-packet-store.ts).
//  - No fabricated data: an empty task list yields zero events and a null
//    `sourceLiveAt`, so ActivityLog keeps its honest `seed` badge until real
//    founder activity exists. Only when there is ≥1 real event does
//    `sourceLiveAt` become non-null and the badge flip to `live`.

import type { CommandCentreTask, TaskStatus } from './tasks'
import type { ActivityDatum, ActivityOrigin, ActivitySeverity } from '@/components/command-center/activity/activity-data'

export interface ActivityFeedPayload {
  source: 'cc:activity'
  generatedAt: string
  events: ActivityDatum[]
  /** generatedAt when ≥1 real event exists, else null — keeps the badge honest. */
  sourceLiveAt: string | null
}

export interface BuildActivityFeedOptions {
  /** Injected "now" — never read the wall clock inside this pure function. */
  now?: Date
  /** Cap on rendered rows. Defaults to 30. */
  limit?: number
}

// Namespaced metadata key written by work-packet-store.ts when a task carries a
// routed WorkPacket. Its presence is one signal that the task is Linear-tracked.
const PACKET_METADATA_KEY = 'packet'

// Map a task status to the operator-facing verb. Honest and terse — describes
// what the agent is doing to the task right now.
const STATUS_VERB: Record<TaskStatus, string> = {
  proposed: 'proposed',
  queued: 'queued',
  running: 'working on',
  blocked: 'blocked on',
  awaiting_approval: 'awaiting approval',
  done: 'shipped',
  failed: 'failed',
}

// Map a task status to the activity severity vocabulary:
//   - running / blocked / awaiting_approval / failed → attention states.
//   - done → a completed 'signal' (a ship worth surfacing).
//   - proposed / queued → quiet 'hush'.
const STATUS_SEVERITY: Record<TaskStatus, ActivitySeverity> = {
  proposed: 'hush',
  queued: 'hush',
  running: 'running',
  blocked: 'signal',
  awaiting_approval: 'signal',
  done: 'signal',
  failed: 'signal',
}

/** Pull the Linear issue id from a task — dedicated column first, then packet metadata. */
function linearIdFor(task: CommandCentreTask): string | null {
  if (task.linear_id) return task.linear_id
  const packet = task.metadata?.[PACKET_METADATA_KEY]
  if (packet && typeof packet === 'object') {
    const candidate = (packet as Record<string, unknown>).linearIssueId
    if (typeof candidate === 'string' && candidate.length > 0) return candidate
  }
  return null
}

/**
 * Derive (origin, url) — WHERE the agent sourced/acted. Priority is the most
 * specific verifiable source first: a Linear issue, then a preview/GitHub URL,
 * then an evidence note, then an external project provider, else the internal
 * CC task itself.
 */
function originFor(task: CommandCentreTask): { origin: ActivityOrigin; url?: string } {
  const linearId = linearIdFor(task)
  if (linearId) {
    return { origin: 'linear', url: `https://linear.app/unite-group/issue/${linearId}` }
  }
  if (task.preview_url) {
    const isGithub = task.preview_url.includes('github.com')
    return { origin: isGithub ? 'github' : 'provider', url: task.preview_url }
  }
  if (task.evidence_path) {
    return { origin: 'evidence' }
  }
  // A namespaced external project (e.g. a provider integration) but no link.
  if (task.project_key && task.project_key !== 'unite-group') {
    return { origin: 'provider' }
  }
  return { origin: 'cc' }
}

function agentFor(task: CommandCentreTask): string {
  return task.agent_owner?.trim() || 'Pi-CEO'
}

function tsFor(task: CommandCentreTask): string {
  return task.updated_at ?? task.created_at
}

/**
 * Build the activity feed from the founder's cc_tasks. Rows are ordered newest
 * first by timestamp and capped at `opts.limit`.
 */
export function buildActivityFeed(
  tasks: CommandCentreTask[],
  opts: BuildActivityFeedOptions = {},
): ActivityFeedPayload {
  const now = opts.now ?? new Date()
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100)
  const generatedAt = now.toISOString()

  const events: ActivityDatum[] = tasks
    .map((task) => {
      const { origin, url } = originFor(task)
      const datum: ActivityDatum = {
        id: task.id,
        ts: tsFor(task),
        agent: agentFor(task),
        verb: STATUS_VERB[task.status],
        target: task.title,
        severity: STATUS_SEVERITY[task.status],
        origin,
      }
      if (url) datum.url = url
      return datum
    })
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
    .slice(0, limit)

  return {
    source: 'cc:activity',
    generatedAt,
    events,
    // Honest source attribution: only flip to "live" when real events exist.
    sourceLiveAt: events.length > 0 ? generatedAt : null,
  }
}
