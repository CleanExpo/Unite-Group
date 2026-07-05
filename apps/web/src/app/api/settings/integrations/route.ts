// GET /api/settings/integrations
// Founder-scoped connected email accounts (Google/Microsoft) for the Settings →
// Integrations UI. Distinct from /api/integrations/status (dashboard panel,
// provider-level connected/not-connected only) — this route lists the actual
// connected account emails so the founder can see which mailbox(es) are wired
// in before clicking "Connect".

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isGoogleConfigured, getConnectedGoogleAccountsWithScopeStatus } from '@/lib/integrations/google-oauth'
import { isMicrosoftConfigured, getConnectedMicrosoftAccounts } from '@/lib/integrations/microsoft-oauth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const googleConfigured = isGoogleConfigured()
  const microsoftConfigured = isMicrosoftConfigured()

  const [googleAccounts, microsoftAccounts] = await Promise.all([
    googleConfigured ? getConnectedGoogleAccountsWithScopeStatus(user.id) : Promise.resolve([]),
    microsoftConfigured ? getConnectedMicrosoftAccounts(user.id) : Promise.resolve([]),
  ])

  return NextResponse.json({
    google: { configured: googleConfigured, accounts: googleAccounts },
    // Microsoft has no reauth-scope tracking yet (no ReauthBanner-equivalent
    // flow exists for it) — `needsReauth` is intentionally absent here rather
    // than fabricated.
    microsoft: { configured: microsoftConfigured, accounts: microsoftAccounts },
  })
}
