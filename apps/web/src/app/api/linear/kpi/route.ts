// src/app/api/linear/kpi/route.ts
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // A count nobody could read is UNKNOWN, not zero. This route previously
  // answered `activeCount: 0, configured: false` for BOTH an unconfigured
  // integration and a thrown read, which is the tiles' own defect one layer
  // down: a failed read rendered as a successful empty one. `activeCount` is
  // now OMITTED whenever it was not read, so a consumer cannot mistake absence
  // for zero, and the two non-success cases are told apart — an unconfigured
  // integration is an expected degrade, a thrown read is a failure and carries
  // that on the status line the way /api/dashboard/kpi does. [UNI-2485]
  if (!process.env.LINEAR_API_KEY) {
    return NextResponse.json({ configured: false })
  }

  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') ?? ''

  try {
    const counts = await fetchIssueCountByBusiness()
    // `?? 0` stays: the read SUCCEEDED, and a business absent from the map
    // genuinely has no active issues. That zero is a fact, not a fallback.
    return NextResponse.json({ activeCount: counts[business] ?? 0, configured: true })
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        unavailable: true,
        error: sanitiseError(error, 'Failed to load Linear issue counts', {
          route: '/api/linear/kpi',
          source: 'linear',
        }),
      },
      { status: 500 },
    )
  }
}
