// src/app/api/boardroom/decisions/[id]/route.ts
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
  let body: {
    status?: string
    rationale?: string
    amount_aud?: number
    deadline?: string
    business_key?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Only allow explicit fields — never spread body directly to prevent field injection
  const patch: TablesUpdate<'ceo_decisions'> = { updated_at: new Date().toISOString() }
  if (body.status       !== undefined) patch.status       = body.status
  if (body.rationale    !== undefined) patch.rationale    = body.rationale
  if (body.amount_aud   !== undefined) patch.amount_aud   = body.amount_aud
  if (body.deadline     !== undefined) patch.deadline     = body.deadline
  if (body.business_key !== undefined) patch.business_key = body.business_key

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ceo_decisions')
    .update(patch)
    .eq('id', id)
    .eq('founder_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to update decision', { route: '/api/boardroom/decisions/[id]' }) }, { status: 500 })
  return NextResponse.json({ decision: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('ceo_decisions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('founder_id', user.id)
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to delete decision', { route: '/api/boardroom/decisions/[id]' }) }, { status: 500 })
  return NextResponse.json({ success: true })
}
