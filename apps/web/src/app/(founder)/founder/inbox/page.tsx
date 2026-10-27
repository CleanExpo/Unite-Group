// src/app/(founder)/founder/inbox/page.tsx
// Founder Inbox: website leads + card enquiries + card feedback, newest first.
// Reads use the signed-in founder's RLS-scoped client (no service role).
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { InboxView } from '@/founder/inbox/InboxView'
import { loadInbox, parseSourceParam, type InboxClient } from '@/lib/crm/inbox'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Inbox — Nexus' }

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[] }>
}) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const { source } = await searchParams
  const supabase = await createClient()
  // card_enquiries / card_feedback are not in the generated Database types yet.
  const result = await loadInbox(supabase as unknown as InboxClient, {
    founderId: user.id,
    now: new Date(),
  })

  return <InboxView result={result} source={parseSourceParam(source)} />
}
