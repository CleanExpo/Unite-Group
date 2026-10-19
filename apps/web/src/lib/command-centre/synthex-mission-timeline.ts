// src/lib/command-centre/synthex-mission-timeline.ts
//
// SPM-audit G2 — the per-mission Synthex timeline. Reads the cc_task_events
// comment rows the Synthex witness receiver wrote for one mission, plus the
// founder's recent Synthex wall rows that arrived with NO mission id (so a
// sender gap is visible, not silently absent). Read-only. A failed read
// throws; it never returns an empty timeline.

import { createClient } from '@/lib/supabase/server'
import { CC_AGENT_EVENTS_TABLE } from './agent-events'
import { CC_TASK_EVENTS_TABLE } from './tasks'
import { SYNTHEX_POST_STATUSES, type SynthexPostStatus } from '@/lib/integrations/synthex-events'

const TIMELINE_LIMIT = 200
const UNLINKED_LIMIT = 20

export interface SynthexTimelineEntry {
  id: string
  /** When Unite-Group recorded the row (cc_task_events.at). */
  receivedAt: string
  /** When the step happened, as sent by Synthex. Null on rows written before it was stored. */
  occurredAt: string | null
  eventType: string
  summary: string
  missionId: string
  count: number | null
  window: string | null
  attributionKey: string | null
  postUrl: string | null
  businessSlug: string | null
  platform: string | null
  postId: string | null
  status: SynthexPostStatus | null
  scheduledAt: string | null
  publishedAt: string | null
  text: string | null
  thumbnailUrls: string[]
  approveUrl: string | null
}

export interface SynthexUnlinkedEvent {
  id: string
  eventType: string | null
  target: string | null
  receivedAt: string
}

export interface SynthexMissionTimeline {
  taskId: string
  /** Oldest step first. */
  entries: SynthexTimelineEntry[]
  /** Newest first: recent Synthex wall rows that carried no mission id. */
  unlinked: SynthexUnlinkedEvent[]
  /** True when a read hit its cap, so older rows were not read. */
  truncated: boolean
}

type ReadResult = PromiseLike<{ data: unknown; error: { message: string } | null }>
interface Filterable {
  eq(column: string, value: unknown): Filterable
  is(column: string, value: null): Filterable
  order(column: string, opts: { ascending: boolean }): { limit(n: number): ReadResult }
}
export interface SynthexTimelineClient {
  from(table: string): { select(columns: string): Filterable }
}

interface TaskEventRow { id: string; task_id: string; at: string; payload: unknown }

const text = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)
const time = (value: unknown): string | null => {
  const t = text(value)
  return t && !Number.isNaN(Date.parse(t)) ? t : null
}
const status = (value: unknown): SynthexPostStatus | null =>
  (SYNTHEX_POST_STATUSES as readonly unknown[]).includes(value) ? (value as SynthexPostStatus) : null

/** Read one stored row back. Only whitelisted, correctly typed values are shown. */
export function readSynthexTimelineEntry(row: TaskEventRow): SynthexTimelineEntry | null {
  const p = (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, unknown>
  if (p.source !== 'synthex') return null
  return {
    id: row.id,
    receivedAt: row.at,
    occurredAt: time(p.occurredAt),
    eventType: text(p.eventType) ?? text(p.event_type) ?? 'unknown',
    summary: text(p.summary) ?? '',
    missionId: row.task_id,
    count: Number.isInteger(p.count) && (p.count as number) >= 0 ? (p.count as number) : null,
    window: text(p.window),
    attributionKey: text(p.attributionKey),
    postUrl: text(p.postUrl),
    businessSlug: text(p.businessSlug),
    platform: text(p.platform),
    postId: text(p.postId),
    status: status(p.status),
    scheduledAt: time(p.scheduledAt),
    publishedAt: time(p.publishedAt),
    text: text(p.text),
    thumbnailUrls: Array.isArray(p.thumbnailUrls) ? p.thumbnailUrls.filter((u): u is string => typeof u === 'string') : [],
    approveUrl: text(p.approveUrl),
  }
}

/** Order by when the step occurred, falling back to arrival for rows without it. */
function orderKey(entry: SynthexTimelineEntry): number {
  return Date.parse(entry.occurredAt ?? entry.receivedAt)
}

export async function loadSynthexMissionTimeline(
  founderId: string,
  taskId: string,
  client?: SynthexTimelineClient,
): Promise<SynthexMissionTimeline> {
  const db = client ?? ((await createClient()) as unknown as SynthexTimelineClient)
  const events = await db
    .from(CC_TASK_EVENTS_TABLE)
    .select('id,task_id,type,payload,at')
    .eq('founder_id', founderId)
    .eq('task_id', taskId)
    .eq('type', 'comment')
    .eq('payload->>source', 'synthex')
    .order('at', { ascending: true })
    .limit(TIMELINE_LIMIT)
  if (events.error || !Array.isArray(events.data)) {
    throw new Error(`Synthex timeline read failed: ${events.error?.message ?? 'no rows returned'}`)
  }
  const wall = await db
    .from(CC_AGENT_EVENTS_TABLE)
    .select('id,tool_name,target,created_at')
    .eq('founder_id', founderId)
    .eq('agent_name', 'synthex')
    .is('plan_key', null)
    .order('created_at', { ascending: false })
    .limit(UNLINKED_LIMIT)
  if (wall.error || !Array.isArray(wall.data)) {
    throw new Error(`Synthex wall read failed: ${wall.error?.message ?? 'no rows returned'}`)
  }
  const eventRows = events.data as TaskEventRow[]
  const wallRows = wall.data as Array<{ id: string; tool_name: string | null; target: string | null; created_at: string }>
  const entries = eventRows
    .map(readSynthexTimelineEntry)
    .filter((entry): entry is SynthexTimelineEntry => entry !== null)
    .sort((a, b) => orderKey(a) - orderKey(b))
  return {
    taskId,
    entries,
    unlinked: wallRows.map(r => ({ id: r.id, eventType: r.tool_name, target: r.target, receivedAt: r.created_at })),
    truncated: eventRows.length >= TIMELINE_LIMIT || wallRows.length >= UNLINKED_LIMIT,
  }
}
