// src/app/api/vault/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/vault'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('credentials_vault')
    .select('id, label, service, notes, metadata, created_at')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to load vault entries', { route: '/api/vault/entries' }) }, { status: 500 })

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    businessKey: (row.metadata as Record<string, string>)?.businessKey ?? '',
    label: row.label,
    service: row.service,
    username: (row.metadata as Record<string, string>)?.username ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }))

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: {
    businessKey: string
    label: string
    service: string
    username?: string
    secret: string
    notes?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.label || !body.service || !body.secret) {
    return NextResponse.json({ error: 'label, service and secret are required' }, { status: 400 })
  }

  const payload = encrypt(body.secret)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('credentials_vault')
    .insert({
      founder_id: user.id,
      label: body.label,
      service: body.service,
      encrypted_value: payload.encryptedValue,
      iv: payload.iv,
      salt: payload.salt,
      notes: body.notes ?? null,
      metadata: {
        businessKey: body.businessKey,
        username: body.username ?? '',
      },
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to save vault entry', { route: '/api/vault/entries' }) }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
