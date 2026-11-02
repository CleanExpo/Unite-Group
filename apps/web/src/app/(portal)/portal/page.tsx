import { PortalWelcome } from '@/components/portal/portal-welcome'
import { getPortalOwner } from '@/lib/portal/owner'

export const dynamic = 'force-dynamic'

/** Welcome and checklist for a card owner. The (portal) layout has already admitted only owners. */
export default async function PortalPage() {
  const access = await getPortalOwner()
  // Defence in depth: the layout handles every other state, so this page renders nothing for them.
  if (access.status !== 'owner') return null
  return <PortalWelcome name={access.name} email={access.email} cardSlugs={access.cardSlugs} />
}
