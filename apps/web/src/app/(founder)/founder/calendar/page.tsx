export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getUser } from '@/lib/supabase/server'
import {
  isGoogleConfigured,
  fetchCalendarEvents,
  getConnectedGoogleAccounts,
} from '@/lib/integrations/google'
import { PageHeader } from '@/components/ui/PageHeader'
import { loadSynthexPosts } from '@/lib/command-centre/synthex-posts'
import { FounderCalendar } from './FounderCalendar'

export default async function CalendarPage() {
  const user = await getUser()
  const configured = isGoogleConfigured()

  const connectedAccounts = user ? await getConnectedGoogleAccounts(user.id) : []

  // Fetch real calendar events when accounts are connected.
  // Never show fabricated mock data — surface "not connected" instead.
  const [result, posts] = await Promise.all([
    user ? fetchCalendarEvents(user.id) : Promise.resolve(null),
    loadSynthexPosts(user?.id ?? null),
  ])
  const events = result?.data ?? []
  const notConnected = !result || result.source === 'not_connected'
  const loadFailed = result?.source === 'error'

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Google Calendar events and Synthex posts"
        tip="Connect a Google account via Email settings to see events here. Synthex posts come from Synthex's witness events."
      />

      {!configured && (
        <div className="border px-4 py-3 rounded-sm text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
        </div>
      )}

      {configured && connectedAccounts.length === 0 && (
        <div className="border px-4 py-3 rounded-sm text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          No Google accounts connected — visit{' '}
          <Link href="/founder/email" className="text-[#15803d] hover:underline">
            Email settings
          </Link>{' '}
          to connect.
        </div>
      )}

      {configured && connectedAccounts.length > 0 && notConnected && (
        <div className="border px-4 py-3 rounded-sm text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Google Calendar not connected — reconnect via{' '}
          <Link href="/founder/email" className="text-[#15803d] hover:underline">
            Email settings
          </Link>{' '}
          to see events.
        </div>
      )}

      {loadFailed && (
        <div role="alert" className="border px-4 py-3 rounded-sm text-sm" style={{ borderColor: '#EF4444', color: '#FCA5A5' }}>
          Calendar unavailable — couldn&apos;t load events from your connected Google
          accounts. This is a load error, not an empty calendar. Try again shortly.
        </div>
      )}

      {configured && connectedAccounts.length > 0 && !notConnected && !loadFailed && events.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No upcoming events across your connected calendars.
        </p>
      )}

      <FounderCalendar events={events} posts={posts} />
    </div>
  )
}
