import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/security/require-admin';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const slug   = req.nextUrl.searchParams.get('slug');
  const search = req.nextUrl.searchParams.get('search');

  if (slug) {
    const { data } = await supabase.from('wiki_pages').select('*').eq('id', slug).single();
    return NextResponse.json(data || {});
  }

  let query = supabase.from('wiki_pages').select('id,title,word_count,tags,updated_at').order('title');
  if (search) query = query.ilike('title', `%${search}%`);

  const { data } = await query;
  return NextResponse.json(data || []);
}
