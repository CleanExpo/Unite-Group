export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { NexusPRDashboard } from '@/components/founder/nexus/NexusPRDashboard'

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
