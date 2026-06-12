// GET /api/empire/data-room — list every data_room_documents row, newest-first.
//
// Powers the /[locale]/empire/data-room admin page (UNI-1989). Returns the
// payload omitted from the list view (clients fetch a single doc via the
// per-id endpoint when they need to inspect it). Founder-only.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const res = await supabase
    .from('data_room_documents')
    .select('id, kind, business_id, period_start, period_end, generated_at, audit_status, updated_at')
    .order('generated_at', { ascending: false })
    .limit(500);

  if (res.error) {
    return NextResponse.json(
      { error: 'data_room_query_failed', detail: res.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { documents: res.data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
