// Storage for the design-lessons loop (UNI-3017). Service-role only; tables are created by
// supabase/migrations/20261026120000_design_feedback_loop.sql (founder-gated, not applied).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DesignEvent, DesignLesson } from './lessons'

type Client = Pick<SupabaseClient, 'from'>

/** The table is not migrated yet: Postgres 42P01, or PostgREST PGRST205 (not in its schema cache). */
const TABLE_MISSING_CODES = new Set(['42P01', 'PGRST205'])
export function isUndefinedTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && TABLE_MISSING_CODES.has(code)
}

export async function recordDesignEvent(client: Client, founderId: string, event: DesignEvent) {
  return client.from('design_events').insert({
    founder_id: founderId,
    system: event.system,
    template: event.template,
    action: event.action,
    edits: event.edits ?? [],
    reason: event.reason || null,
    subject: event.subject ?? null,
  })
}

export const EVENT_WINDOW_DAYS = 180
export const EVENT_READ_LIMIT = 5000

export async function loadRecentEvents(client: Client, now: Date = new Date()) {
  const since = new Date(now.getTime() - EVENT_WINDOW_DAYS * 86_400_000).toISOString()
  return client
    .from('design_events')
    .select('system, template, action, edits, reason')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(EVENT_READ_LIMIT)
}

export async function saveLessons(client: Client, founderId: string, lessons: DesignLesson[], eventCount: number) {
  return client.from('design_lessons').insert({ founder_id: founderId, lessons, event_count: eventCount })
}

export async function loadLatestLessons(client: Client): Promise<DesignLesson[]> {
  const { data, error } = await client
    .from('design_lessons')
    .select('lessons')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const lessons = (data as { lessons?: unknown } | null)?.lessons
  return Array.isArray(lessons) ? (lessons as DesignLesson[]) : []
}
