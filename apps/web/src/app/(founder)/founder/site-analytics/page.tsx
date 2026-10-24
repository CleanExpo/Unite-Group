// src/app/(founder)/founder/site-analytics/page.tsx
// Founder-only view of the first-party site analytics (UNI-3001). The founder layout requires a
// signed-in user; this page additionally requires the founder allow-list, then reads through the
// service client (site_events has no anon policy). A failed read renders an error, never zeros.
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'
import { loadSiteReport, type ReportClient, type ReportResult } from '@/lib/analytics/site-events-report'
import { maybePurgeSiteEvents } from '@/lib/analytics/site-events-retention'
import { SiteAnalyticsView } from './site-analytics-view'

export const dynamic = 'force-dynamic'

export default async function SiteAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  if (!hasPrivateAccess(user)) notFound()

  const params = (await searchParams) ?? {}
  const days = params.days === '30' ? 30 : 7

  let result: ReportResult
  if (!hasSupabaseServiceConfig()) {
    result = { status: 'error', days, message: 'Service database access is not configured' }
  } else {
    try {
      const service = createServiceClient()
      result = await loadSiteReport(service as unknown as ReportClient, days)
      await maybePurgeSiteEvents(service as unknown as Parameters<typeof maybePurgeSiteEvents>[0])
    } catch (err) {
      result = { status: 'error', days, message: err instanceof Error ? err.message : String(err) }
    }
  }

  return <SiteAnalyticsView result={result} />
}
