import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { getWorkPacket } from '@/lib/command-centre/work-packet-store'
import type { SupabaseLike } from '@/lib/command-centre/tasks'

// UNI-2147 — inspect a single durable work packet by id. Founder-auth.
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await context.params

  const db = (await createClient()) as unknown as SupabaseLike
  const packet = await getWorkPacket(db, user.id, id)
  if (!packet) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ packet }, { headers: { 'Cache-Control': 'no-store' } })
}
