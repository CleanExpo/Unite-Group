// GET /api/command-centre/cost-allocation
// Founder-scoped cost-allocation summary for the Mission Control deck.
// Reads the metering tables (cost_source / cost_record / revenue_record) for
// the current calendar month + prior-month cost. cost_source is service-role
// only (forced RLS, no policies), so this route uses the service client —
// but stays founder-gated like every sibling route. Real sums only; empty
// tables produce zeros, never fabricated numbers.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

interface SourceRow {
  id: string
  name: string
  enabled: boolean
}
interface CostRow {
  cost_source_id: string
  amount_aud: number | string | null
}
interface RevenueRow {
  amount_aud: number | string | null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function sumAmounts(rows: { amount_aud: number | string | null }[]): number {
  return rows.reduce((acc, r) => acc + (Number(r.amount_aud) || 0), 0)
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = createServiceClient()

    // Calendar-month bounds (UTC dates — period_* are DATE columns).
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const monthStart = isoDate(new Date(Date.UTC(y, m, 1)))
    const monthEnd = isoDate(new Date(Date.UTC(y, m + 1, 0)))
    const priorStart = isoDate(new Date(Date.UTC(y, m - 1, 1)))
    const priorEnd = isoDate(new Date(Date.UTC(y, m, 0)))

    // A record belongs to a month when its period overlaps that month.
    const [sourcesRes, costRes, priorCostRes, revenueRes] = await Promise.all([
      supabase.from('cost_source').select('id, name, enabled'),
      supabase
        .from('cost_record')
        .select('cost_source_id, amount_aud')
        .lte('period_start', monthEnd)
        .gte('period_end', monthStart),
      supabase
        .from('cost_record')
        .select('cost_source_id, amount_aud')
        .lte('period_start', priorEnd)
        .gte('period_end', priorStart),
      supabase
        .from('revenue_record')
        .select('amount_aud')
        .lte('period_start', monthEnd)
        .gte('period_end', monthStart),
    ])

    const firstError =
      sourcesRes.error ?? costRes.error ?? priorCostRes.error ?? revenueRes.error
    if (firstError) {
      return NextResponse.json({ error: 'Failed to load cost allocation' }, { status: 500 })
    }

    const sourceRows = (sourcesRes.data ?? []) as SourceRow[]
    const costRows = (costRes.data ?? []) as CostRow[]
    const priorRows = (priorCostRes.data ?? []) as CostRow[]
    const revenueRows = (revenueRes.data ?? []) as RevenueRow[]

    const bySource = new Map<string, number>()
    for (const row of costRows) {
      const amount = Number(row.amount_aud) || 0
      bySource.set(row.cost_source_id, (bySource.get(row.cost_source_id) ?? 0) + amount)
    }

    // Include: any source with records this month, plus enabled sources at $0.
    const nameById = new Map(sourceRows.map((s) => [s.id, s.name]))
    const included = new Map<string, { id: string; name: string; amount_aud: number }>()
    for (const [id, amount] of bySource) {
      included.set(id, { id, name: nameById.get(id) ?? id, amount_aud: amount })
    }
    for (const s of sourceRows) {
      if (s.enabled && !included.has(s.id)) {
        included.set(s.id, { id: s.id, name: s.name, amount_aud: 0 })
      }
    }

    const sources = [...included.values()].sort((a, b) => b.amount_aud - a.amount_aud)

    return NextResponse.json(
      {
        period: { start: monthStart, end: monthEnd },
        sources,
        total_cost_aud: sumAmounts(costRows),
        total_revenue_aud: sumAmounts(revenueRows),
        prior_month_cost_aud: sumAmounts(priorRows),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'cost-allocation failed') },
      { status: 500 },
    )
  }
}
