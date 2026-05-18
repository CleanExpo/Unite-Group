// POST/GET /api/cron/data-room/regenerate
//
// Vercel-cron entry point that fires all 5 DataRoom generators in one pass.
// Auth: Bearer ${CRON_SECRET} (Vercel cron sends this automatically).
// Runs daily per vercel.json — see "/api/cron/data-room/regenerate" entry.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { timingSafeBearerMatch } from '@/lib/security/safe-compare';
import { runAllGenerators } from '@/lib/data-room/run-all-generators';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!timingSafeBearerMatch(auth, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const results = await runAllGenerators({ supabase });
  const allOk = results.every((r) => r.ok);

  return NextResponse.json(
    {
      ok: allOk,
      generated_at: new Date().toISOString(),
      results,
    },
    { status: allOk ? 200 : 207, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
