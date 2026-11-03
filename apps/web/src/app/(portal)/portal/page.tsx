import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { ConfirmItIsYou, NoPortalYet } from '@/components/portal/portal-notice'
import { PortalWelcome } from '@/components/portal/portal-welcome'
import { decidePortalAccess } from '@/lib/portal/changes/access'
import { getPortalOwner } from '@/lib/portal/changes/owner-stub'
import { PORTAL_LOGIN_URL } from '@/lib/portal/paths'
import { getUser } from '@/lib/supabase/server'

// Every portal page depends on who is signed in: render per request, never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your portal | Unite Group',
  robots: { index: false, follow: false },
}

/**
 * Welcome and checklist for a business owner. This page guards itself, like /portal/changes and /portal/setup, so
 * there is no (portal) layout guard: that would also lock signed-out invite holders out of /portal/join.
 * Signed out -> sign in, then straight back to /portal. Signed in with no portal -> a friendly "no portal yet" page.
 * Owner on the emailed link only (aal1) -> confirm the second step. Owner on aal2 -> the welcome page.
 * The owner is the same one the portal tables' row rules use (tenant claim in app_metadata, aal2).
 */
export default async function PortalPage() {
  const user = await getUser()
  if (!user) redirect(PORTAL_LOGIN_URL)
  const access = decidePortalAccess(await getPortalOwner())
  const email = user.email ?? null
  if (access.kind === 'sign_in') return <NoPortalYet email={email} />
  if (access.kind === 'verify_second_factor') return <ConfirmItIsYou email={email} />
  return <PortalWelcome email={email} plan={access.owner.plan} />
}
