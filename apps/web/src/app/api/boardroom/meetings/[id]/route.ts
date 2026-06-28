// src/app/api/boardroom/meetings/[id]/route.ts
// GET  /api/boardroom/meetings/:id  — full meeting + notes
// PATCH /api/boardroom/meetings/:id — update status

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()

  const [meetingRes, notesRes] = await Promise.all([
    supabase.from('board_meetings').select('*').eq('id', id).eq('founder_id', user.id).single(),
    supabase
      .from('board_meeting_notes')
      .select('*')
      .eq('meeting_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (meetingRes.error) return NextResponse.json({ error: sanitiseError(meetingRes.error, 'Meeting not found', { route: '/api/boardroom/meetings/[id]' }) }, { status: 404 })
  return NextResponse.json({ meeting: meetingRes.data, notes: notesRes.data ?? [] })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('board_meetings')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('founder_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to update meeting', { route: '/api/boardroom/meetings/[id]' }) }, { status: 500 })
  return NextResponse.json({ meeting: data })
}
