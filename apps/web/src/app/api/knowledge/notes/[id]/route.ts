// src/app/api/knowledge/notes/[id]/route.ts
// GET /api/knowledge/notes/{id} — single note with full content

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('knowledge_notes')
    .select('*')
    .eq('founder_id', user.id)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    return NextResponse.json({ error: sanitiseError(error, 'Failed to load note', { route: '/api/knowledge/notes/[id]' }) }, { status: 500 })
  }

  return NextResponse.json(data)
}
