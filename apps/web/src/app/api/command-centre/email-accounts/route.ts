// GET /api/command-centre/email-accounts
// Founder-scoped email-account roster for the Mission Control deck.
// Reads credentials_vault rows (google / microsoft / imap) + env presence
// (SendGrid). READ-only status — links to Settings; never touches OAuth routes.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { deriveEmailAccounts, EMAIL_PROVIDERS, type VaultRow } from '@/lib/command-centre/email-accounts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('credentials_vault')
      .select('service, updated_at, last_accessed_at, metadata')
      .eq('founder_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to load email accounts' }, { status: 500 })
    }

    const vaultRows = (data ?? []) as VaultRow[]
    const envKeys = EMAIL_PROVIDERS.flatMap((p) => p.envKeys ?? [])
    const envPresent = Object.fromEntries(envKeys.map((k) => [k, !!process.env[k]?.trim()]))

    const payload = deriveEmailAccounts({
      now: new Date().toISOString(),
      vaultRows,
      envPresent,
    })

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'email-accounts failed') }, { status: 500 })
  }
}
