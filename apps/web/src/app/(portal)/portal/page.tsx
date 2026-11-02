import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { NoPortalYet, PortalUnavailable } from '@/components/portal/portal-notice'
import { PortalWelcome } from '@/components/portal/portal-welcome'
import { PORTAL_LOGIN_URL, getPortalOwner } from '@/lib/portal/owner'

// The page depends on who is signed in: render per request, never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your portal | Unite Group',
  robots: { index: false, follow: false },
}

/**
 * Owner guard and welcome for the business-owner portal home.
 * Signed out -> sign in, then straight back to /portal. Signed in without a card -> a friendly "no portal yet" page.
 * A failed ownership read -> a "try again" page, never the "no portal" one. Owners -> the welcome and checklist.
 * The guard sits on this page, not on a (portal) layout: /portal/join must open for a signed-out invite holder, and
 * /portal/changes and /portal/setup check their own owner. The founder allow-list in src/proxy.ts still keeps an owner
 * out of /founder and the founder APIs.
 */
export default async function PortalPage() {
  const access = await getPortalOwner()
  if (access.status === 'anonymous') redirect(PORTAL_LOGIN_URL)
  if (access.status === 'not_owner') return <NoPortalYet email={access.email} />
  if (access.status === 'error') return <PortalUnavailable email={access.email} />
  return <PortalWelcome name={access.name} email={access.email} cardSlugs={access.cardSlugs} />
}
