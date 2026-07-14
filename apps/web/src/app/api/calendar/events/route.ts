// POST /api/calendar/events — create a Google Calendar event (WS2 P4).
// Founder session auth. Writes to the given connected Google account's primary
// calendar. The read side is elsewhere; this adds write.

import { NextRequest, NextResponse } from 'next/server'

import { getUser } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/integrations/calendar-write'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as {
    email?: string
    title?: string
    startIso?: string
    endIso?: string
    description?: string
    timeZone?: string
  } | null

  if (!body?.email || !body.title || !body.startIso || !body.endIso) {
    return NextResponse.json(
      { error: 'email, title, startIso and endIso are required' },
      { status: 400 }
    )
  }

  try {
    const event = await createCalendarEvent(user.id, body.email, {
      title: body.title,
      startIso: body.startIso,
      endIso: body.endIso,
      description: body.description,
      timeZone: body.timeZone,
    })
    return NextResponse.json({ ok: true, event }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'calendar create failed' },
      { status: 400 }
    )
  }
}
