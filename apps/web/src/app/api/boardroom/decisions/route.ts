// src/app/api/boardroom/decisions/route.ts
// GET  /api/boardroom/decisions?type=strategic&status=open
// POST /api/boardroom/decisions — create decision

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')

  const supabase = await createClient()
  let query = supabase
    .from('ceo_decisions')
    .select('*')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to load board decisions', { route: '/api/boardroom/decisions' }) }, { status: 500 })
  return NextResponse.json({ decisions: data })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: {
    title: string
    type: string
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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ceo_decisions')
    .insert({
      founder_id: user.id,
      title: body.title,
      type: body.type,
      rationale: body.rationale,
      amount_aud: body.amount_aud,
      deadline: body.deadline,
      business_key: body.business_key,
    })
    .select()
    .single()

  if (error) {
    console.error('[CEO Decisions] insert error:', error.code, error.message, error.details)
    return NextResponse.json({ error: sanitiseError(error, 'Failed to save decision', { route: '/api/boardroom/decisions' }) }, { status: 500 })
  }
  return NextResponse.json({ decision: data }, { status: 201 })
}
