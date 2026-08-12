import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { readLocalHostStatus } from '@/lib/command-centre/local-host-status'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  return NextResponse.json(await readLocalHostStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
