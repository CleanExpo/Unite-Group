import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const [pending, completed] = await Promise.all([
    supabase.from('wiki_sources').select('*').eq('status','pending').order('created_at', { ascending: false }),
    supabase.from('wiki_sources').select('*').eq('status','completed').order('processed_at', { ascending: false }).limit(20),
  ]);
  return NextResponse.json({ pending: pending.data || [], completed: completed.data || [] });
}
