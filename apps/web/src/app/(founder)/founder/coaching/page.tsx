import Link from 'next/link'
import { createClient, getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Business Coaching' }

export default async function CoachingIndexPage() {
  const user = await getUser()
  if (!user) return null // (founder) layout redirects; this satisfies the type

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coaching_engagements')
    .select('id, business_name, client_name, status, consent_given, updated_at')
    .eq('founder_id', user.id)
    .order('business_name', { ascending: true })
    .order('client_name', { ascending: true })

  return (
    <div className="px-8 py-6 max-w-4xl">
      <h1
        className="text-[20px] font-semibold tracking-tight"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Business Coaching
      </h1>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        Your coaching clients. Open one to review a session or build the next brief.
      </p>

      {/* Honest failure — an error must never render as an empty list. */}
      {error && (
        <div
          className="mt-6 rounded-sm border px-4 py-3 text-[13px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger, #dc2626)' }}
        >
          Couldn&apos;t load engagements: {error.message}
        </div>
      )}

      {!error && (data ?? []).length === 0 && (
        <div
          className="mt-6 rounded-sm border px-4 py-6 text-[13px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          No coaching clients yet. An engagement links a contact you already have in
          the CRM to a coaching record — no new contact list.
        </div>
      )}

      {!error && (data ?? []).length > 0 && (
        <ul className="mt-6 flex flex-col gap-1">
          {(data ?? []).map((e) => (
            <li key={e.id}>
              <Link
                href={`/founder/coaching/${e.id}`}
                className="nav-item-hover flex items-center gap-3 rounded-sm border px-4 h-12 transition-colors duration-100"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span
                  className="text-[13px] font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {e.business_name} - {e.client_name}
                </span>
                {!e.consent_given && (
                  <span
                    className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                    style={{ background: 'var(--surface-elevated)', color: 'var(--color-text-disabled)' }}
                    title="No recording or publication consent on file"
                  >
                    no consent
                  </span>
                )}
                <span
                  className="ml-auto shrink-0 text-[11px] capitalize"
                  style={{ color: 'var(--color-text-disabled)' }}
                >
                  {e.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
