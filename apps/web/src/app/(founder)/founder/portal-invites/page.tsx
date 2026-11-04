import { notFound } from 'next/navigation'

import { hasPrivateAccess } from '@/lib/auth/private-access'
import { IAQ_BOARD_INVITEES } from '@/lib/portal/board/invitees'
import { listInvites, type InviteRow } from '@/lib/portal/invites/founder'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'

import { BoardInvitees } from './board-invitees'
import { InvitePanel } from './invite-panel'
import styles from './portal-invites.module.css'

export const dynamic = 'force-dynamic'

/** Founder tool: make a single-use invite code for a client's business portal, see every code, cancel one. */
export default async function PortalInvitesPage() {
  const user = await getUser()
  if (!user || !hasPrivateAccess(user)) notFound()

  let invites: InviteRow[] | null = null
  let readError: string | null = null
  if (!hasSupabaseServiceConfig()) {
    readError = 'the database is not connected here'
  } else {
    try {
      invites = await listInvites(createServiceClient())
    } catch {
      readError = 'could not read invite codes'
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Portal invite codes</h1>
      <p className={styles.lead}>
        An invite code lets one business owner open their portal on the free plan. Each code works once. You see the
        code only when you make it, so copy it then.
      </p>
      <InvitePanel invites={invites} readError={readError} />
      <BoardInvitees invitees={IAQ_BOARD_INVITEES} />
    </main>
  )
}
