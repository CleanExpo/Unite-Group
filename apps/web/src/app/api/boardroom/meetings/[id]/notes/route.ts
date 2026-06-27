// src/app/api/boardroom/meetings/[id]/notes/route.ts
// POST /api/boardroom/meetings/:id/notes — add CEO annotation

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  let body: { content: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('board_meeting_notes')
    .insert({ meeting_id: id, content: body.content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to save meeting note', { route: '/api/boardroom/meetings/[id]/notes' }) }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}
