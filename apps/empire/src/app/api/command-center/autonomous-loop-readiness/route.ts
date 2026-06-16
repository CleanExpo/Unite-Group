import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import { buildAutonomousLoopReadiness } from '@/lib/mission-control/autonomous-loop-readiness';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  return NextResponse.json(buildAutonomousLoopReadiness(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
