export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('id, title, tags, word_count, updated_at')
    .order('title');
  if (error) return NextResponse.json({ pages: [], error: error.message });
  return NextResponse.json({ pages: data ?? [] });
}
