export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = getAdminClient();

  // Count agent actions by status
  const { data } = await supabase
    .from('agent_actions')
    .select('status, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const counts = {
    ideas_in_flight: data?.filter(a => a.status === 'pending').length ?? 0,
    board_active: data?.filter(a => a.status === 'in_progress').length ?? 0,
    completed_today: data?.filter(a => a.status === 'done').length ?? 0,
  };

  return NextResponse.json(counts);
}
