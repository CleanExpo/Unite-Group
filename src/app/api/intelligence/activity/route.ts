export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get('project');
  const supabase = getAdminClient();
  let query = supabase
    .from('pi_ceo_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (project) query = query.eq('project_id', project);
  const { data, error } = await query;
  if (error) return NextResponse.json({ activities: [], error: error.message });
  return NextResponse.json({ activities: data ?? [] });
}
