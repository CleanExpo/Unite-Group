// src/app/api/dashboard/kpi/route.ts
// GET /api/dashboard/kpi
// Batch endpoint — fetches Xero revenue + Linear issues for ALL businesses in one request.
// Replaces 16 individual API calls (8 Xero + 8 Linear) with a single round-trip.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { fetchRevenueMTD } from '@/lib/integrations/xero'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'

export const dynamic = 'force-dynamic'

/** Business keys that have Xero connections */
const XERO_KEYS = ['dr', 'nrpg', 'carsi', 'restore', 'synthex', 'ccw'] as const
/** All business keys tracked in Linear */
const LINEAR_KEYS = ['dr', 'nrpg', 'carsi', 'restore', 'synthex', 'ato', 'ccw'] as const

export interface BatchKPIEntry {
  revenueCents?: number
  growth?: number
  invoiceCount?: number
  activeIssues?: number
  source?: 'xero' | 'mock'
  /** True when THIS business's Xero read REJECTED. Revenue is UNKNOWN — not
   *  zero, and not demo. Without it the entry is indistinguishable from a
   *  business that simply has no Xero connection. */
  xeroDegraded?: boolean
}

export interface BatchKPIResponse {
  kpis: Record<string, BatchKPIEntry>
  /** Sanitised message — present only when an upstream source could not be read. */
  error?: string
  /** True when Linear was unreadable, so activeIssues is UNKNOWN, not zero. */
  linearDegraded?: boolean
  /** Business keys whose Xero read REJECTED. Absent when every Xero read
   *  resolved. The status stays 200 deliberately: blanking the whole dashboard
   *  because one of six revenue reads failed is a worse outcome than a partial
   *  one, so the degradation travels in the payload and the cards render it. */
  xeroDegradedKeys?: string[]
}

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Fetch Xero revenue for all businesses + Linear counts in parallel
  //
  // The Linear rejection USED TO be caught down to `{}` and the response still
  // returned 200. Since fetchIssueCountByBusiness started throwing when Linear
  // is unconfigured, that turned a hard failure into a successful-looking empty
  // read: every card received `{}`, which is indistinguishable from "no data
  // yet", so KPICard skipped its individual fallbacks and sat on "Loading…"
  // forever with nothing — data or error — ever arriving. A failed read must
  // never be reported as a successful empty one.
  let linearError: unknown = null
  const [xeroResults, linearCounts] = await Promise.all([
    Promise.allSettled(
      XERO_KEYS.map(async (key) => {
        const result = await fetchRevenueMTD(user.id, key)
        return { key, ...result }
      })
    ),
    fetchIssueCountByBusiness().catch((err) => {
      linearError = err
      return {} as Record<string, number>
    }),
  ])

  const kpis: Record<string, BatchKPIEntry> = {}

  // Initialise all Linear keys with empty entries
  for (const key of LINEAR_KEYS) {
    kpis[key] = {}
  }

  // Merge Xero results. A REJECTED read is not "no revenue": dropping it left
  // the initialised `{}` entry in place, which is truthy enough to suppress the
  // card's individual fallback fetch and empty enough to render placeholder
  // revenue beside a "Demo" badge — a failed read presented as a successful
  // empty one. That is the same defect the Linear comment above describes, one
  // source over. `allSettled` preserves order, so the index carries the key a
  // rejection cannot.
  const xeroDegradedKeys: string[] = []
  xeroResults.forEach((result, index) => {
    const key = XERO_KEYS[index]
    if (result.status === 'fulfilled') {
      const { data, source } = result.value
      kpis[key] = {
        ...kpis[key],
        revenueCents: data.revenueCents,
        growth: data.growth,
        invoiceCount: data.invoiceCount,
        source,
      }
      return
    }
    kpis[key] = { ...kpis[key], xeroDegraded: true }
    xeroDegradedKeys.push(key)
  })

  // Merge Linear issue counts.
  //
  // `fetchIssueCountByBusiness` builds a SPARSE map — it only creates a key by
  // incrementing — so a business with genuinely zero open issues is absent from
  // it after a wholly successful read. Setting `activeIssues` only when the key
  // existed therefore omitted real zeroes, and because the batch entry is still
  // truthy, KPICard skipped its individual fallback and fell through to its
  // static "Loading…" secondary. A successful read rendered as never-finished.
  //
  // `?? 0` is correct ONLY because the read succeeded. Applying it to an
  // unreadable Linear is the defect UNI-2476 removed from the hub sweep, which
  // is why this is guarded on `linearError` rather than written inline. [UNI-2490]
  if (linearError === null) {
    for (const key of LINEAR_KEYS) {
      kpis[key] = { ...kpis[key], activeIssues: linearCounts[key] ?? 0 }
    }
  }

  // The Xero half is still merged above so the diagnostics survive alongside
  // whatever WAS readable, but the status line follows the verdict — browsers,
  // `res.ok` checks and uptime monitors key off the status, not off a JSON
  // field. Same rule as /api/cron/hub-sweep.
  if (linearError !== null) {
    return NextResponse.json(
      {
        kpis,
        error: sanitiseError(linearError, 'Failed to load dashboard KPIs', {
          route: '/api/dashboard/kpi',
          source: 'linear',
        }),
        linearDegraded: true,
        ...(xeroDegradedKeys.length > 0 ? { xeroDegradedKeys } : {}),
      } satisfies BatchKPIResponse,
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      kpis,
      ...(xeroDegradedKeys.length > 0 ? { xeroDegradedKeys } : {}),
    } satisfies BatchKPIResponse,
  )
}
