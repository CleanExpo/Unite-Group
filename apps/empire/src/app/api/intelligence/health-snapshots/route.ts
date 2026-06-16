export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('pi_ceo_health_snapshots')
    .select('id, project_id, overall_health, security_score, dependencies, security_findings, snapshot_at')
    .order('snapshot_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ snapshots: [], error: error.message });
  return NextResponse.json({ snapshots: data ?? [] });
}
