import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const type = req.nextUrl.searchParams.get('type') || 'activity';

  if (type === 'health') {
    const projectId = req.nextUrl.searchParams.get('project');
    let query = supabase
      .from('pi_ceo_health_snapshots')
      .select('project_id,overall_health,security_score,dependencies,deployment_health,snapshot_at')
      .order('snapshot_at', { ascending: false })
      .limit(100);
    if (projectId) query = query.eq('project_id', projectId);
    const { data } = await query;
    return NextResponse.json(data || []);
  }

  const { data } = await supabase
    .from('pi_ceo_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json(data || []);
}
