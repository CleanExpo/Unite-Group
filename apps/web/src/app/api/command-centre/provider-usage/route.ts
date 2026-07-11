import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { buildProviderCockpit, readProviderSignalsFromEnv } from '@/lib/command-centre/provider-usage'

// UNI-2146 — provider usage cockpit. Founder-auth, metadata-only (no secrets).
export const dynamic = 'force-dynamic'
// Metadata-only read (env + a single auth check) — must return in well under a
// second. Cap the function so a hung auth/cold-start fails fast instead of
// burning the platform-max 300s (seen in the runtime-error timeout cluster).
export const maxDuration = 15

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const signals = readProviderSignalsFromEnv(process.env as Record<string, string | undefined>)
  const payload = buildProviderCockpit({ signals, now: new Date().toISOString() })
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
