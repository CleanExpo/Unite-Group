import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { NexusPRDashboard } from '@/founder/nexus/NexusPRDashboard'

export const metadata = noIndexPageMetadata({
  path: "/founder/nexus",
  title: "Nexus | Unite Group",
  description: "Private founder workspace: Nexus.",
})
export default async function NexusApprovalsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="p-6">
      <PageHeader
        title="Nexus — PR Approvals"
        subtitle="Pending pull requests tagged nexus-pending-approval across all repos"
        className="mb-6"
      />
      <NexusPRDashboard />
    </div>
  )
}
