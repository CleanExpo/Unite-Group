import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Pagination cap (audit 4.2): never serialise the entire contact book in one
  // payload — that hangs/crashes the tab at scale. Default 100, max 500.
  const params = new URL(request.url).searchParams
  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '100', 10) || 100, 1), 500)
  const offset = Math.max(parseInt(params.get('offset') ?? '0', 10) || 0, 0)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to load contacts', { route: '/api/contacts' }) }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.first_name) {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  const validStatuses = ['lead', 'prospect', 'client', 'churned', 'archived']
  const status = validStatuses.includes(body.status) ? body.status : 'lead'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      founder_id: user.id,
      business_id: body.business_id || null,
      first_name: body.first_name,
      last_name: body.last_name || null,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      role: body.role || null,
      status,
      tags: body.tags || [],
      metadata: body.metadata || {},
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to save contact', { route: '/api/contacts' }) }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
