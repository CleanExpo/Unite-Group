import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import type { TablesUpdate } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'company', 'role', 'status', 'business_id', 'tags', 'metadata']
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  if (updates.status) {
    const validStatuses = ['lead', 'prospect', 'client', 'churned', 'archived']
    if (!validStatuses.includes(updates.status as string)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .update(updates as TablesUpdate<'contacts'>)
    .eq('id', id)
    .eq('founder_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to save contact', { route: '/api/contacts/[id]' }) }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const supabase = await createClient()
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('founder_id', user.id)

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to delete contact', { route: '/api/contacts/[id]' }) }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
