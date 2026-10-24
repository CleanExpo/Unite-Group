import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFounderUserId } from '@/lib/auth/founder-user-id'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/auth/login')

  const { id } = await params
  if (!UUID_RE.test(id) || user.id !== getFounderUserId()) notFound()

  const { data: lead, error } = await supabase.from('crm_leads')
    .select('id, first_name, last_name, company, email, phone, message, interests, captured_at')
    .eq('founder_id', user.id).eq('id', id).maybeSingle()
  if (error) throw new Error('Could not load enquiry')
  if (!lead) notFound()

  const fields = [
    ['Name', [lead.first_name, lead.last_name].filter(Boolean).join(' ')],
    ['Business', lead.company],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Ask', lead.interests],
    ['Message', lead.message],
    ['Received', new Date(lead.captured_at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })],
  ]

  return (
    <main className="max-w-3xl px-8 py-6" style={{ color: 'var(--color-text-primary)' }}>
      <h1 className="text-xl font-semibold tracking-tight">Enquiry</h1>
      <dl className="mt-6 space-y-4">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-sm border px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
            <dt className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || 'Not given'}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
