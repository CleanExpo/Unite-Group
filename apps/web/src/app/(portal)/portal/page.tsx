import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { ConfirmItIsYou, NoPortalYet } from '@/components/portal/portal-notice'
import { PortalWelcome } from '@/components/portal/portal-welcome'
import { BOARD_PATH, boardDocumentFor } from '@/lib/portal/board/documents'
import { decidePortalAccess } from '@/lib/portal/changes/access'
import { getPortalOwner } from '@/lib/portal/owner'
import { PORTAL_LOGIN_URL } from '@/lib/portal/paths'
import { getUser } from '@/lib/supabase/server'
import { noIndexPageMetadata } from '@/lib/page-metadata'

// Every portal page depends on who is signed in: render per request, never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/portal',
  title: 'Your portal | Unite Group',
  description: 'Your Unite Group business portal — tasks, changes and settings.',
})

/**
 * Welcome and checklist for a business owner. This page guards itself, like /portal/changes and /portal/setup, so
 * there is no (portal) layout guard: that would also lock signed-out invite holders out of /portal/join.
 * Signed out -> sign in, then straight back to /portal. Signed in with no portal -> a friendly "no portal yet" page.
 * Owner on the emailed link only (aal1) -> confirm the second step. Owner on aal2 -> the welcome page.
 * The owner is the same one the portal tables' row rules use (their portal_tenant_members row, aal2): lib/portal/owner.ts.
 */
export default async function PortalPage() {
  const user = await getUser()
  if (!user) redirect(PORTAL_LOGIN_URL)
  const access = decidePortalAccess(await getPortalOwner())
  const email = user.email ?? null
  if (access.kind === 'sign_in') return <NoPortalYet email={email} />
  if (access.kind === 'verify_second_factor') return <ConfirmItIsYou email={email} />
  const board = boardDocumentFor(access.owner.tenantSlug)
  return <PortalWelcome email={email} plan={access.owner.plan} board={board ? { title: board.title, href: BOARD_PATH } : null} />
}
