import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from('board_mandates')
    .select('id,title,status,project_id,pr_url,ci_status,phill_approved,created_at')
    .not('status', 'eq', 'closed')
    .order('created_at', { ascending: false })
    .limit(5);
  return NextResponse.json(data || []);
}
