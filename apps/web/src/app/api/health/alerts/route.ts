import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import type { LogOutcome } from '@/lib/notifications/lead-alert'
import { checkSuppression } from '@/lib/notifications/sendgrid-suppression'

export const dynamic = 'force-dynamic'

const WINDOW_HOURS = 72
const PAGE_SIZE = 500
const MAX_IDS = 20
const DELIVERY_NOTE = 'sent means SendGrid accepted the message (HTTP 202); delivery is not confirmed'

type DeliveryRow = {
  id: string
  source_id: string
  outcome: LogOutcome
  dedup_key: string | null
  created_at: string
  updated_at: string
}

function bearerMatches(request: Request, token: string): boolean {
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${token}`)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function GET(request: Request) {
  const token = process.env.ALERT_HEALTH_TOKEN?.trim()
  if (token) {
    // A read-only counter credential must never be the cron master key.
    if (token === process.env.CRON_SECRET?.trim()) {
      return NextResponse.json({ error: 'ALERT_HEALTH_TOKEN must differ from CRON_SECRET' }, { status: 500 })
    }
    if (!bearerMatches(request, token)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
  } else {
    const denied = assertCronAuth(request)
    if (denied) return denied
  }

  try {
    const founderId = process.env.FOUNDER_USER_ID?.trim()
    if (!founderId) throw new Error('ConfigurationError')
    const supabase = createServiceClient()
    const now = Date.now()
    const start = now - WINDOW_HOURS * 60 * 60 * 1000
    const logs: DeliveryRow[] = []
    const leads: { id: string; captured_at: string; alert_erased_at?: unknown }[] = []
    // Read an extra hour only for coverage of suppressions at the window edge.
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('alert_delivery_log')
        .select('id, source_id, outcome, dedup_key, created_at, updated_at')
        .eq('founder_id', founderId).eq('source_kind', 'new_lead')
        .gte('created_at', new Date(start - 60 * 60 * 1000).toISOString())
        .lte('created_at', new Date(now).toISOString())
        .order('id').range(offset, offset + PAGE_SIZE - 1)
      if (error || !data) throw new Error('ReadError')
      logs.push(...data as DeliveryRow[])
      if (data.length < PAGE_SIZE) break
    }
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('crm_leads')
        // Only the erasure marker, never the rest of additional_data.
        .select('id, captured_at, alert_erased_at:additional_data->>alert_erased_at').eq('founder_id', founderId)
        .gte('captured_at', new Date(start).toISOString())
        .lt('captured_at', new Date(now - 2 * 60 * 1000).toISOString())
        .order('id').range(offset, offset + PAGE_SIZE - 1)
      if (error || !data) throw new Error('ReadError')
      leads.push(...data as typeof leads)
      if (data.length < PAGE_SIZE) break
    }

    const sources = new Map<string, DeliveryRow[]>()
    for (const row of logs) {
      if (Date.parse(row.created_at) < start) continue
      sources.set(row.source_id, [...(sources.get(row.source_id) ?? []), row])
    }
    let attempts = 0
    let sent = 0
    const failedIds: string[] = []
    let failed = 0
    let unconfigured = 0
    let deduped = 0
    const loggedIds = new Set(logs.map((row) => row.source_id))
    const unalertedIds = new Set(leads
      // The founder erased this enquiry's alert log on purpose; the marker holds no personal data.
      .filter((lead) => typeof lead.alert_erased_at !== 'string')
      .filter((lead) => !loggedIds.has(lead.id)).map((lead) => lead.id))
    let lastFailureAt: string | null = null
    for (const [sourceId, rows] of sources) {
      const suppressed = rows.every((row) => row.outcome === 'deduped')
      if (suppressed) {
        deduped++
        const covered = rows.some((row) => row.dedup_key && logs.some((other) =>
          other.source_id !== sourceId && other.dedup_key === row.dedup_key && other.outcome === 'sent' &&
          Date.parse(other.created_at) <= Date.parse(row.created_at) &&
          Date.parse(other.created_at) >= Date.parse(row.created_at) - 60 * 60 * 1000))
        if (!covered) unalertedIds.add(sourceId)
      } else {
        attempts++
      }
      if (rows.some((row) => row.outcome === 'unconfigured')) unconfigured++
      const failures = rows.filter((row) => row.outcome === 'failed' || row.outcome === 'unconfigured' ||
        (row.outcome === 'pending' && Date.parse(row.created_at) < now - 15_000))
      if (rows.some((row) => row.outcome === 'sent')) sent++
      if (failures.length) {
        failed++
        failedIds.push(sourceId)
        for (const row of failures) {
          const timestamp = row.outcome === 'pending' ? row.created_at : row.updated_at
          if (!lastFailureAt || timestamp > lastFailureAt) lastFailureAt = timestamp
        }
      }
    }
    const destination = await checkSuppression(process.env.LEAD_ALERT_EMAIL_TO ?? '', { apiKey: process.env.SENDGRID_API_KEY })
    const ids = (values: Iterable<string>) => [...values].sort().slice(0, MAX_IDS)
    return NextResponse.json({ window_hours: WINDOW_HOURS, attempts, failed, unconfigured,
      deduped, unalerted: unalertedIds.size, last_failure_at: lastFailureAt, sent, delivery_note: DELIVERY_NOTE,
      destination, failed_ids: ids(failedIds), unalerted_ids: ids(unalertedIds) })
  } catch {
    return NextResponse.json({ error: 'Alert health unavailable' }, { status: 503 })
  }
}
