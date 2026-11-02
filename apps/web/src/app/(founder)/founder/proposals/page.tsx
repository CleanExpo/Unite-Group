// src/app/(founder)/founder/proposals/page.tsx
import { ProposalDesk } from './proposal-desk'
import { WEBSITE_PLANS } from '@/lib/proposals/plans'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import { getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ProposalsPage() {
  const user = await getUser()
  if (!user || user.id !== getFounderUserId()) {
    return <p className="p-6">Only the founder can issue proposals.</p>
  }

  // A failed read throws to error.tsx: an empty list here would look like "no leads".
  const { data: leads, error } = await createServiceClient()
    .from('crm_leads')
    .select('id, first_name, last_name, company, email')
    .eq('founder_id', user.id)
    .in('status', ['new', 'qualified', 'nurture'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`crm_leads read failed: ${error.message}`)

  return (
    <ProposalDesk
      plans={WEBSITE_PLANS.map((plan) => ({ id: plan.id, name: plan.name, amountCents: plan.amountCents, isPlaceholder: plan.isPlaceholder }))}
      leads={(leads ?? []).map((lead) => ({
        id: lead.id as string,
        label: `${[lead.first_name, lead.last_name].filter(Boolean).join(' ')}${lead.company ? `, ${lead.company}` : ''} (${lead.email})`,
      }))}
    />
  )
}
