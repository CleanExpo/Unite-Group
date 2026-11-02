import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { NoPortalYet, PortalUnavailable } from '@/components/portal/portal-notice'
import { PORTAL_LOGIN_URL, getPortalOwner } from '@/lib/portal/owner'

// Every portal page depends on who is signed in: render per request, never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your portal | Unite Group',
  robots: { index: false, follow: false },
}

/**
 * Owner guard for the business-owner portal.
 * Signed out -> sign in, then straight back to /portal. Signed in without a card -> a friendly "no portal yet" page.
 * A failed ownership read -> a "try again" page, never the "no portal" one. Owners -> the page.
 * The founder allow-list in src/proxy.ts is not touched: an owner still cannot reach /founder or the founder APIs.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const access = await getPortalOwner()
  if (access.status === 'anonymous') redirect(PORTAL_LOGIN_URL)
  if (access.status === 'not_owner') return <NoPortalYet email={access.email} />
  if (access.status === 'error') return <PortalUnavailable email={access.email} />
  return <>{children}</>
}
