// src/app/api/strategy/insights/route.ts
// GET  /api/strategy/insights?business=<key>&status=<status>&date=today
// POST /api/strategy/insights  — create manual insight

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(request.url)
  const business = url.searchParams.get('business')
  const status = url.searchParams.get('status')
  const dateParam = url.searchParams.get('date')

  const supabase = await createClient()
  let query = supabase
    .from('strategy_insights')
    .select('*')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })

  if (business) query = query.eq('business_key', business)
  if (status) query = query.eq('status', status)
  if (dateParam === 'today') {
    const today = new Date().toISOString().split('T')[0]
    query = query.eq('run_date', today)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to load insights', { route: 'strategy/insights' }) }, { status: 500 })

  return NextResponse.json({ insights: data })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: {
    business_key: string
    type: string
    title: string
    body: string
    priority?: string
    metadata?: Record<string, unknown>
  }
  try {
    body = await request.json() as {
      business_key: string
      type: string
      title: string
      body: string
      priority?: string
      metadata?: Record<string, unknown>
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategy_insights')
    .insert({
      founder_id: user.id,
      business_key: body.business_key,
      type: body.type,
      title: body.title,
      body: body.body,
      priority: body.priority ?? 'medium',
      metadata: (body.metadata ?? {}) as Json,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to create insight', { route: 'strategy/insights' }) }, { status: 500 })
  return NextResponse.json({ insight: data }, { status: 201 })
}
