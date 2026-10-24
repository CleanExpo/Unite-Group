// src/lib/command-centre/synthex-posts.ts
//
// UNI-2348 — Synthex post lifecycle for the Mission Control calendar. The
// witness receiver appends one cc_synthex_post_events row per accepted event
// that carries a postId (mission or not); /founder/calendar folds them into
// each post's latest state. Honest states: a missing table is
// 'migration_not_applied', any other failed read is 'error' — never an empty
// calendar.

import { createClient } from '@/lib/supabase/server'
import {
  SYNTHEX_POST_STATUSES,
  synthexEventDetail,
  type SynthexEvent,
  type SynthexPostStatus,
} from '@/lib/integrations/synthex-events'

export const CC_SYNTHEX_POST_EVENTS_TABLE = 'cc_synthex_post_events'
const READ_LIMIT = 500

const STATUS_BY_EVENT: Record<string, SynthexPostStatus> = {
  'content.drafted': 'drafted',
  'content.held_for_review': 'awaiting_approval',
  'content.approved': 'approved',
  'content.scheduled': 'scheduled',
  'content.published': 'published',
  'content.failed': 'failed',
}

/** The sender's explicit status wins; otherwise the event type implies one. */
export function statusForEvent(eventType: string, status: SynthexPostStatus | null): SynthexPostStatus | null {
  return status ?? (Object.hasOwn(STATUS_BY_EVENT, eventType) ? STATUS_BY_EVENT[eventType] : null)
}

const POST_TABLE_MISSING_CODES = ['42P01', 'PGRST205']

/**
 * True only when cc_synthex_post_events itself is absent (the founder-gated
 * "migration not applied" state): Postgres 42P01 or PostgREST PGRST205. Column
 * errors (42703, PGRST204), a different missing relation, permissions and
 * network faults are NOT this state. Without a code, the message must name the
 * table and must not be about a column.
 */
export function isPostTableMissing(error: { code?: string | null; message?: string }): boolean {
  const message = error.message ?? ''
  if (error.code) return POST_TABLE_MISSING_CODES.includes(error.code) && message.includes(CC_SYNTHEX_POST_EVENTS_TABLE)
  return /does not exist|could not find the table/i.test(message) && !/column/i.test(message) && message.includes(CC_SYNTHEX_POST_EVENTS_TABLE)
}

export interface SynthexPostEventRow {
  id: string
  post_id: string
  mission_id: string | null
  event_type: string
  status: SynthexPostStatus | null
  occurred_at: string
  created_at: string
  detail: Record<string, unknown>
}

type Result = PromiseLike<{ data?: unknown; error: { message: string; code?: string | null } | null }>
interface Readable {
  select(columns: string): Readable
  eq(column: string, value: unknown): Readable
  order(column: string, opts: { ascending: boolean }): { limit(n: number): Result }
}
export interface SynthexPostsClient {
  from(table: string): Readable & { insert(values: unknown): Result }
}

/** The row for one accepted event, or null when it names no post. Only whitelisted fields. */
export function toPostEventRow(founderId: string, event: SynthexEvent) {
  const detail = synthexEventDetail(event)
  if (!detail.postId) return null
  return {
    founder_id: founderId,
    post_id: detail.postId,
    mission_id: detail.missionId,
    event_type: detail.eventType,
    status: statusForEvent(detail.eventType, detail.status),
    occurred_at: detail.occurredAt,
    detail,
  }
}

/**
 * Append the event to the post store. Returns 'table_missing' only when the
 * table is absent (migration not applied); any other failed write throws so the
 * caller can refuse to acknowledge a post it did not store.
 */
export async function recordSynthexPostEvent(
  client: SynthexPostsClient,
  founderId: string,
  event: SynthexEvent,
): Promise<'recorded' | 'skipped' | 'table_missing'> {
  const row = toPostEventRow(founderId, event)
  if (!row) return 'skipped'
  const { error } = await client.from(CC_SYNTHEX_POST_EVENTS_TABLE).insert(row)
  if (error) {
    if (isPostTableMissing(error)) return 'table_missing'
    throw new Error(`recordSynthexPostEvent failed: ${error.message}`)
  }
  return 'recorded'
}

export interface SynthexPost {
  postId: string
  status: SynthexPostStatus | null
  platform: string | null
  businessSlug: string | null
  orgSlug: string | null
  missionId: string | null
  text: string | null
  thumbnailUrls: string[]
  approveUrl: string | null
  postUrl: string | null
  scheduledAt: string | null
  publishedAt: string | null
  firstSeenAt: string
  lastEventAt: string
  /** YYYY-MM-DD in AEST: the scheduled day, else the day it was first drafted. */
  day: string
}

export interface SynthexPostsResult {
  source: 'connected' | 'not_connected' | 'error'
  reason?: 'no_founder' | 'migration_not_applied'
  error?: string
  posts: SynthexPost[]
  /** True when the read hit its cap, so older events were not read. */
  truncated: boolean
}

/** Calendar day (YYYY-MM-DD) of an instant in AEST, the deck's timezone. */
export function calendarDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const time = (v: unknown): string | null => {
  const s = str(v)
  return s && !Number.isNaN(Date.parse(s)) ? s : null
}
const validStatus = (v: unknown): SynthexPostStatus | null =>
  (SYNTHEX_POST_STATUSES as readonly unknown[]).includes(v) ? (v as SynthexPostStatus) : null

/** Fold append-only rows into one latest-state post each; a later null never erases an earlier value. */
export function foldPostEvents(rows: SynthexPostEventRow[]): SynthexPost[] {
  const ordered = [...rows].sort((a, b) =>
    Date.parse(a.occurred_at) - Date.parse(b.occurred_at) || Date.parse(a.created_at) - Date.parse(b.created_at))
  const posts = new Map<string, Omit<SynthexPost, 'day'>>()
  for (const row of ordered) {
    const d = row.detail && typeof row.detail === 'object' ? row.detail : {}
    const prev = posts.get(row.post_id)
    const thumbs = Array.isArray(d.thumbnailUrls) ? d.thumbnailUrls.filter((u): u is string => typeof u === 'string') : []
    posts.set(row.post_id, {
      postId: row.post_id,
      status: validStatus(row.status) ?? prev?.status ?? null,
      platform: str(d.platform) ?? prev?.platform ?? null,
      businessSlug: str(d.businessSlug) ?? prev?.businessSlug ?? null,
      orgSlug: str(d.orgSlug) ?? prev?.orgSlug ?? null,
      missionId: row.mission_id ?? prev?.missionId ?? null,
      text: str(d.text) ?? prev?.text ?? null,
      thumbnailUrls: thumbs.length > 0 ? thumbs : prev?.thumbnailUrls ?? [],
      approveUrl: str(d.approveUrl) ?? prev?.approveUrl ?? null,
      postUrl: str(d.postUrl) ?? prev?.postUrl ?? null,
      scheduledAt: time(d.scheduledAt) ?? prev?.scheduledAt ?? null,
      publishedAt: time(d.publishedAt) ?? prev?.publishedAt ?? null,
      firstSeenAt: prev?.firstSeenAt ?? row.occurred_at,
      lastEventAt: row.occurred_at,
    })
  }
  return [...posts.values()]
    .map(p => ({ ...p, day: calendarDay(p.scheduledAt ?? p.firstSeenAt) }))
    .sort((a, b) => a.day.localeCompare(b.day) || Date.parse(a.scheduledAt ?? a.firstSeenAt) - Date.parse(b.scheduledAt ?? b.firstSeenAt))
}

export async function loadSynthexPosts(founderId: string | null, client?: SynthexPostsClient): Promise<SynthexPostsResult> {
  if (!founderId) return { source: 'not_connected', reason: 'no_founder', posts: [], truncated: false }
  try {
    const db = client ?? ((await createClient()) as unknown as SynthexPostsClient)
    const { data, error } = await db
      .from(CC_SYNTHEX_POST_EVENTS_TABLE)
      .select('id,post_id,mission_id,event_type,status,occurred_at,created_at,detail')
      .eq('founder_id', founderId)
      .order('occurred_at', { ascending: false })
      .limit(READ_LIMIT)
    if (error) {
      if (isPostTableMissing(error)) return { source: 'not_connected', reason: 'migration_not_applied', posts: [], truncated: false }
      throw new Error(error.message)
    }
    if (!Array.isArray(data)) throw new Error('no rows returned')
    return { source: 'connected', posts: foldPostEvents(data as SynthexPostEventRow[]), truncated: data.length >= READ_LIMIT }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    return { source: 'error', error: message, posts: [], truncated: false }
  }
}
