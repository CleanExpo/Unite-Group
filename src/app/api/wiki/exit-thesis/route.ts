export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const supabase = getAdminClient();

  const { data: page } = await supabase
    .from('wiki_pages')
    .select('content, updated_at')
    .eq('id', 'exit-thesis')
    .single();

  // Also get current total ARR from businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('arr_aud, slug');

  const currentArr = (businesses ?? []).reduce((s, b) => s + (Number(b.arr_aud) || 0), 0);
  const targetDate = new Date('2028-06-30');
  const daysRemaining = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Extract deal comps from wiki
  const dealComps = [
    { company: 'RPM Global', multiple: 14.3, value: '$1.056B', date: 'Feb-26' },
    { company: 'Qoria', multiple: 8.6, value: '$1.016B', date: 'Feb-26' },
    { company: 'Micromine', multiple: 10.0, value: '$1.310B', date: 'Apr-25' },
  ];

  // Extract threshold from wiki (or use defaults)
  const minArr = 167_000_000;  // $167M minimum
  const maxArr = 250_000_000;  // $250M maximum

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
  });
}
