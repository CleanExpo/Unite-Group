export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('id, title, tags, word_count, updated_at')
    .order('title');
  if (error) return NextResponse.json({ pages: [], error: error.message });
  return NextResponse.json({ pages: data ?? [] });
}
