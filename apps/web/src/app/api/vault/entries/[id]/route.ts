// src/app/api/vault/entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { encrypt, decrypt, type VaultPayload } from '@/lib/vault'
import { sanitiseError } from '@/lib/error-reporting'
import type { TablesUpdate } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('credentials_vault')
    .select('id, label, service, encrypted_value, iv, salt, notes, created_at')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let secret: string
  try {
    secret = decrypt({
      encryptedValue: data.encrypted_value,
      iv: data.iv,
      salt: data.salt,
    } as VaultPayload)
  } catch {
    return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    label: data.label,
    service: data.service,
    secret,
    notes: data.notes ?? '',
    createdAt: data.created_at,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from('credentials_vault')
    .delete()
    .eq('id', id)
    .eq('founder_id', user.id)

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to delete vault entry', { route: '/api/vault/entries/[id]' }) }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  let body: {
    label?: string
    service?: string
    username?: string
    secret?: string
    notes?: string
    businessKey?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.label) update.label = body.label
  if (body.service) update.service = body.service
  if (body.notes !== undefined) update.notes = body.notes
  if (body.secret) {
    const payload: VaultPayload = encrypt(body.secret)
    update.encrypted_value = payload.encryptedValue
    update.iv = payload.iv
    update.salt = payload.salt
  }

  const supabase = await createClient()

  // Fetch current metadata to merge
  const { data: current } = await supabase
    .from('credentials_vault')
    .select('metadata')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  const currentMeta = (current?.metadata as Record<string, string>) ?? {}
  update.metadata = {
    ...currentMeta,
    ...(body.businessKey !== undefined && { businessKey: body.businessKey }),
    ...(body.username !== undefined && { username: body.username }),
  }

  const { error } = await supabase
    .from('credentials_vault')
    .update(update as TablesUpdate<'credentials_vault'>)
    .eq('id', id)
    .eq('founder_id', user.id)

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to save vault entry', { route: '/api/vault/entries/[id]' }) }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
