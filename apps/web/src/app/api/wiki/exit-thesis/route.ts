// GET /api/wiki/exit-thesis — exit thesis data from wiki_pages

import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = await createClient()

  const { data: page } = await supabase
    .from('wiki_pages')
    .select('content, updated_at')
    .eq('id', 'exit-thesis')
    .single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('arr_aud, slug')
    .eq('founder_id', user.id)

  const currentArr = (businesses ?? []).reduce((s, b) => s + (Number(b.arr_aud) || 0), 0)
  const targetDate = new Date('2028-06-30')
  const daysRemaining = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const dealComps = [
    { company: 'RPM Global', multiple: 14.3, value: '$1.056B', date: 'Feb-26' },
    { company: 'Qoria', multiple: 8.6, value: '$1.016B', date: 'Feb-26' },
    { company: 'Micromine', multiple: 10.0, value: '$1.310B', date: 'Apr-25' },
  ]

  const minArr = 167_000_000
  const maxArr = 250_000_000

  return NextResponse.json({
    currentArr,
    minTargetArr: minArr,
    maxTargetArr: maxArr,
    gapToMin: Math.max(0, minArr - currentArr),
    targetDate: targetDate.toISOString(),
    daysRemaining,
    dealComps,
    multipleRange: { min: 8, max: 12 },
    lastUpdated: page?.updated_at ?? null,
  })
}
