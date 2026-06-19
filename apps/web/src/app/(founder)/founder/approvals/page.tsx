export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ApprovalQueue } from '@/components/founder/approvals/ApprovalQueue'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Tables } from '@/types/database'

export type ApprovalItem = Pick<
  Tables<'approval_queue'>,
  'id' | 'type' | 'title' | 'description' | 'created_at' | 'expires_at'
>

export default async function ApprovalsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('approval_queue')
    .select('id, type, title, description, created_at, expires_at')
    .eq('founder_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load approval queue: ${error.message}`)
  }

  const items: ApprovalItem[] = data ?? []

  return (
    <div className="p-6">
      <PageHeader
        title="Approvals"
        subtitle="AI-requested actions waiting for your decision"
        className="mb-6"
      />
      <ApprovalQueue items={items} />
    </div>
  )
}
