import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import type { LogOutcome } from '@/lib/notifications/lead-alert'

export const dynamic = 'force-dynamic'

const WINDOW_HOURS = 72
const PAGE_SIZE = 500

type DeliveryRow = {
  id: string
  source_id: string
  outcome: LogOutcome
  dedup_key: string | null
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  const token = process.env.ALERT_HEALTH_TOKEN?.trim()
  if (token) {
    if (request.headers.get('authorization') !== `Bearer ${token}`) {
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
    const leads: { id: string; captured_at: string }[] = []
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
        .select('id, captured_at').eq('founder_id', founderId)
        .gte('captured_at', new Date(start).toISOString())
        .lt('captured_at', new Date(now - 2 * 60 * 1000).toISOString())
        .order('id').range(offset, offset + PAGE_SIZE - 1)
      if (error || !data) throw new Error('ReadError')
      leads.push(...data as { id: string; captured_at: string }[])
      if (data.length < PAGE_SIZE) break
    }

    const sources = new Map<string, DeliveryRow[]>()
    for (const row of logs) {
      if (Date.parse(row.created_at) < start) continue
      sources.set(row.source_id, [...(sources.get(row.source_id) ?? []), row])
    }
    let attempts = 0
    let failed = 0
    let unconfigured = 0
    let deduped = 0
    const loggedIds = new Set(logs.map((row) => row.source_id))
    const unalertedIds = new Set(leads.filter((lead) => !loggedIds.has(lead.id)).map((lead) => lead.id))
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
      if (failures.length) {
        failed++
        for (const row of failures) {
          const timestamp = row.outcome === 'pending' ? row.created_at : row.updated_at
          if (!lastFailureAt || timestamp > lastFailureAt) lastFailureAt = timestamp
        }
      }
    }
    return NextResponse.json({ window_hours: WINDOW_HOURS, attempts, failed, unconfigured,
      deduped, unalerted: unalertedIds.size, last_failure_at: lastFailureAt })
  } catch {
    return NextResponse.json({ error: 'Alert health unavailable' }, { status: 503 })
  }
}
