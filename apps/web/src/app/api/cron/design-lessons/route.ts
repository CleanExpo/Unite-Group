// GET /api/cron/design-lessons — weekly refresh of the design-lessons loop (UNI-3017).
// Reads the last 180 days of design_events, ranks "what clients prefer" and saves a
// design_lessons snapshot that /cards/order (default film) and generation prompts read.
// Gated twice: CRON_SECRET, then DESIGN_LESSONS_LIVE=1 (dormant by default: no reads, no
// writes). Not registered in vercel.json: registering the weekly schedule is a go-live step.

import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import { isDesignLessonsArmed } from '@/lib/design-feedback/arming'
import { designEventSchema, summarizeLessons, type DesignEvent } from '@/lib/design-feedback/lessons'
import { loadRecentEvents, saveLessons } from '@/lib/design-feedback/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Suggested schedule at go-live: Sundays 20:00 UTC = Mondays 06:00 Brisbane. */
export const DESIGN_LESSONS_SCHEDULE = '0 20 * * 0'

export async function GET(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  if (!isDesignLessonsArmed()) {
    return NextResponse.json({
      success: true,
      armed: false,
      persisted: false,
      reason: 'DESIGN_LESSONS_LIVE is not set to "1": the design-lessons refresh is dormant',
    })
  }

  const founderId = getFounderUserId()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })

  const client = createServiceClient()
  const { data, error } = await loadRecentEvents(client, founderId)
  if (error) {
    // The code only: messages and details can echo stored event text.
    console.error('design-lessons: read failed', error.code)
    return NextResponse.json({ error: 'Could not read design events' }, { status: 500 })
  }

  const events: DesignEvent[] = []
  let skipped = 0
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const parsed = designEventSchema.safeParse({
      system: row.system,
      template: row.template,
      action: row.action,
      edits: Array.isArray(row.edits) ? row.edits : undefined,
      reason: typeof row.reason === 'string' ? row.reason : undefined,
    })
    if (parsed.success) events.push(parsed.data)
    else skipped += 1
  }

  const lessons = summarizeLessons(events)
  const saved = await saveLessons(client, founderId, lessons, events.length)
  if (saved.error) {
    console.error('design-lessons: save failed', saved.error.code)
    return NextResponse.json({ error: 'Could not save lessons' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    armed: true,
    persisted: true,
    events: events.length,
    skipped,
    top: lessons.slice(0, 3).map((l) => l.template),
  })
}
