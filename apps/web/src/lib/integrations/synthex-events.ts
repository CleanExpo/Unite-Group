/**
 * Synthex witness-event mapping — pure functions, no I/O.
 *
 * Ported from apps/empire/src/lib/integrations/synthex-events.ts. Here a
 * validated Synthex event becomes ONE redacted cc_agent_events row (names and
 * targets only — the table stores no payload by design) plus, when it names a
 * mission, the whitelisted structured detail for that mission's cc_task_events
 * payload. Transport lives in app/api/webhooks/synthex/route.ts.
 */

import { z } from 'zod'
import type { AgentEventInput } from '@/lib/command-centre/agent-events'

export const SYNTHEX_AGENT_NAME = 'synthex'
export const SYNTHEX_MACHINE = 'synthex.social'
const MAX_TARGET = 512

/** A short single-line printable label (window, attribution key). */
const label = z.string().trim().min(1).max(64).regex(/^[\x20-\x7e]+$/, 'single-line printable text only')

/** An https URL with no embedded credentials. Rendering is further limited to LinkedIn. */
const httpsUrl = z.string().max(500).refine((value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}, 'must be an https URL without credentials')

/** Post lifecycle states the Mission Control calendar shows. */
export const SYNTHEX_POST_STATUSES = ['drafted', 'awaiting_approval', 'approved', 'scheduled', 'published', 'failed'] as const
export type SynthexPostStatus = (typeof SYNTHEX_POST_STATUSES)[number]
export const MAX_POST_TEXT = 5000
const MAX_THUMBNAILS = 4

export const synthexEventSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
    source: z.literal('synthex'),
    timestamp: z.string().datetime(),
    orgSlug: z.string().trim().min(1).max(60).optional(),
    missionId: z.string().uuid().optional(),
    // Structured fields. Malformed values are rejected (400), never stored.
    occurredAt: z.string().datetime().optional(),
    count: z.number().int().min(0).max(10_000_000).optional(),
    window: label.optional(),
    attributionKey: label.optional(),
    // Post lifecycle (Mission Control calendar: read and approve every post).
    postId: z.string().trim().min(1).max(128).regex(/^[\x20-\x7e]+$/, 'single-line printable text only').optional(),
    status: z.enum(SYNTHEX_POST_STATUSES).optional(),
    scheduledAt: z.string().datetime().optional(),
    publishedAt: z.string().datetime().optional(),
    text: z.string().max(MAX_POST_TEXT).optional(),
    thumbnailUrls: z.array(httpsUrl).max(MAX_THUMBNAILS).optional(),
    approveUrl: httpsUrl.optional(),
    postUrl: httpsUrl.optional(),
  })
  .passthrough()
  .superRefine((event, ctx) => {
    if (event.type === 'outcome.trials') {
      if (event.count === undefined) ctx.addIssue({ code: 'custom', path: ['count'], message: 'outcome.trials needs a count' })
      if (event.window === undefined) ctx.addIssue({ code: 'custom', path: ['window'], message: 'outcome.trials needs a window' })
    }
    // A failed RA read must never travel with a number that could read as a result.
    if (event.type === 'outcome.read_failed' && event.count !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['count'], message: 'outcome.read_failed must not carry a count' })
    }
  })

export type SynthexEvent = z.infer<typeof synthexEventSchema>

/** Synthex organization slugs → business slugs where they differ. */
const BUSINESS_SLUG_ALIASES: Record<string, string> = {
  ccw: 'ccw-crm',
  nrpg: 'dr-nrpg',
}

export function resolveBusinessSlug(orgSlug: string | undefined): string | null {
  if (!orgSlug) return null
  const slug = orgSlug.trim().toLowerCase()
  if (!slug) return null
  return BUSINESS_SLUG_ALIASES[slug] ?? slug
}

/** Strip control characters and collapse whitespace so a value stays one line. */
function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** The whitelisted structured fields of an event. Nothing else is ever stored. */
export interface SynthexEventDetail {
  missionId: string | null
  eventType: string
  /** When the step happened: occurredAt if sent, else the sender's timestamp. */
  occurredAt: string
  sentAt: string
  orgSlug: string | null
  businessSlug: string | null
  platform: string | null
  count: number | null
  window: string | null
  attributionKey: string | null
  postId: string | null
  status: SynthexPostStatus | null
  scheduledAt: string | null
  publishedAt: string | null
  /** Full post text, ≤5k chars, newlines kept, other control characters removed. */
  text: string | null
  thumbnailUrls: string[]
  /** Deep link into Synthex where the founder reads and approves the post. */
  approveUrl: string | null
  postUrl: string | null
}

/** Keep line breaks and tabs; drop every other control character. */
function postText(value: string | undefined): string | null {
  if (value === undefined) return null
  const cleaned = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/g, '').trim()
  return cleaned || null
}

function optionalLine(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const line = oneLine(value).slice(0, max)
  return line || null
}

export function synthexEventDetail(event: SynthexEvent): SynthexEventDetail {
  // The live weekly digest names its count and window differently; map them, ignore if malformed.
  const digest = event.type === 'content.outcomes'
  const digestCount = digest && Number.isInteger(event.postsPublished) && (event.postsPublished as number) >= 0
    ? (event.postsPublished as number)
    : null
  return {
    missionId: event.missionId ?? null,
    eventType: oneLine(event.type).slice(0, 128),
    occurredAt: event.occurredAt ?? event.timestamp,
    sentAt: event.timestamp,
    orgSlug: event.orgSlug ? oneLine(event.orgSlug) : null,
    businessSlug: resolveBusinessSlug(event.orgSlug),
    platform: optionalLine(event.platform, 40),
    count: event.count ?? digestCount,
    window: event.window ?? (digest ? optionalLine(event.isoWeek, 64) : null),
    attributionKey: event.attributionKey ?? null,
    postId: event.postId ?? null,
    status: event.status ?? null,
    scheduledAt: event.scheduledAt ?? null,
    publishedAt: event.publishedAt ?? null,
    text: postText(event.text),
    thumbnailUrls: event.thumbnailUrls ?? [],
    approveUrl: event.approveUrl ?? null,
    postUrl: event.postUrl ?? null,
  }
}

/** One-line human summary. Unknown types are still witnessed, never dropped. */
export function summariseEvent(event: SynthexEvent): string {
  const brand = event.orgSlug ? ` for ${oneLine(event.orgSlug)}` : ''
  const type = oneLine(event.type)
  const detail = synthexEventDetail(event)
  const platform = detail.platform ?? 'social'
  const window = detail.window ? ` in ${detail.window}` : ''
  let summary: string
  switch (event.type) {
    case 'campaign.planned':
      summary = `Synthex planned a campaign${brand}`
      break
    case 'content.drafted':
      summary = `Synthex drafted a ${platform} post${brand}`
      break
    case 'content.held_for_review':
      summary = `Synthex held a draft for human review${brand}`
      break
    case 'content.approved':
      summary = `A Synthex draft was approved${brand}`
      break
    case 'content.published':
      summary = `Synthex published a ${platform} post${brand}${detail.postUrl ? `: ${detail.postUrl}` : ' (post link not sent)'}`
      break
    case 'outcome.trials': {
      const n = detail.count ?? 0 // schema guarantees a count for this type
      const attribution = detail.attributionKey ? ` attributed to ${detail.attributionKey}` : ' (attribution key not sent)'
      summary = `Synthex outcome: ${n} trial${n === 1 ? '' : 's'}${attribution}${window}${brand}`
      break
    }
    case 'outcome.read_failed':
      summary = `Synthex outcome: trials unknown — RA read failed${window}${brand}`
      break
    case 'content.outcomes':
      summary = `Synthex weekly outcomes digest${brand}`
      break
    case 'campaign.started':
      summary = `Synthex campaign started${brand}`
      break
    case 'campaign.completed':
      summary = `Synthex campaign completed${brand}`
      break
    case 'revenue.daily':
      summary = 'Synthex daily revenue snapshot'
      break
    default:
      summary = `Synthex event: ${type}${brand}`
  }
  return summary.slice(0, MAX_TARGET)
}

/**
 * The wall row's target: the summary, an explicit "no mission id" when the
 * sender sent none, and when the step occurred (created_at is arrival time).
 */
function wallTarget(event: SynthexEvent): string {
  const detail = synthexEventDetail(event)
  const suffix = `${detail.missionId ? '' : ' · no mission id'} · occurred ${detail.occurredAt}`
  return `${summariseEvent(event).slice(0, MAX_TARGET - suffix.length)}${suffix}`
}

/** Map a validated event to its single cc_agent_events input. */
export function toAgentEventInput(event: SynthexEvent): AgentEventInput {
  return {
    agentName: SYNTHEX_AGENT_NAME,
    // cc_agent_events.surface CHECK allows only codex|claude-code|pi-ceo-dev|local.
    surface: 'local',
    machine: SYNTHEX_MACHINE,
    projectKey: resolveBusinessSlug(event.orgSlug),
    eventType: 'status',
    toolName: oneLine(event.type).slice(0, 128),
    // The mission id, as runner-claim already does; null when the sender sent none.
    planKey: event.missionId ?? null,
    target: wallTarget(event),
  }
}
