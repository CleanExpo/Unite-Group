// src/app/api/boardroom/team/[id]/route.ts
import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import type { TablesUpdate } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .update(body as TablesUpdate<'team_members'>)
    .eq('id', id)
    .eq('founder_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to update team member', { route: '/api/boardroom/team/[id]' }) }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('team_members').update({ active: false }).eq('id', id).eq('founder_id', user.id)
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to remove team member', { route: '/api/boardroom/team/[id]' }) }, { status: 500 })
  return NextResponse.json({ success: true })
}
