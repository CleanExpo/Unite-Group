// src/app/api/bookkeeper/export/invoices/route.ts
// Accountant hand-off: invoice register CSV for one business + FY quarter.
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getBusinessByKey } from '@/lib/businesses'
import { getInvoicesForExport, toInvoicesCsv, quarterSlug } from '@/lib/bookkeeper/export'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const business = getBusinessByKey(searchParams.get('business') ?? '')
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!business) return NextResponse.json({ error: 'Unknown or missing business' }, { status: 400 })
  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return NextResponse.json({ error: 'from and to (YYYY-MM-DD) are required' }, { status: 400 })
  }

  const result = await getInvoicesForExport(user.id, business.key, from, to)
  const slug = quarterSlug(from)
  const csv = toInvoicesCsv(result)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="Invoices-${business.key}-${slug}-${result.source}.csv"`,
    },
  })
}
