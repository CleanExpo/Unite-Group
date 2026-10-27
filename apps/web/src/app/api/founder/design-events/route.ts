// POST /api/founder/design-events — capture step of the design-lessons loop (UNI-3017).
// Records one client design event: { system: 'card'|'site', template, action:
// 'chosen'|'edited'|'approved'|'rejected', edits?, reason?, subject? }.
// Security: founder session (401) + founder allow-list (403, fail-closed). founder_id is
// always the session user, never the payload. Writes go through the service role.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import { designEventSchema } from '@/lib/design-feedback/lessons'
import { isUndefinedTable, recordDesignEvent } from '@/lib/design-feedback/store'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' } as const

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE })
  if (!hasPrivateAccess(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: NO_STORE })
  }
  const parsed = designEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid design event' }, { status: 400, headers: NO_STORE })
  }

  const { error } = await recordDesignEvent(createServiceClient(), user.id, parsed.data)
  if (error) {
    if (isUndefinedTable(error)) {
      return NextResponse.json({ error: 'design_events is not migrated yet' }, { status: 503, headers: NO_STORE })
    }
    // The code only: messages and details can echo the submitted reason.
    console.error('design-events: record failed', error.code)
    return NextResponse.json({ error: 'Could not record the event' }, { status: 500, headers: NO_STORE })
  }
  return NextResponse.json({ recorded: true }, { status: 201, headers: NO_STORE })
}
