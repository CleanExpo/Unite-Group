import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { buildProviderCockpit, readProviderSignalsFromEnv } from '@/lib/command-centre/provider-usage'

// UNI-2146 — provider usage cockpit. Founder-auth, metadata-only (no secrets).
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const signals = readProviderSignalsFromEnv(process.env as Record<string, string | undefined>)
  const payload = buildProviderCockpit({ signals, now: new Date().toISOString() })
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
