// POST/GET /api/cron/data-room/regenerate
//
// Vercel-cron entry point that fires all 5 DataRoom generators in one pass.
// Auth: Bearer ${CRON_SECRET} (Vercel cron sends this automatically).
// Runs daily per vercel.json — see "/api/cron/data-room/regenerate" entry.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { timingSafeBearerMatch } from '@/lib/security/safe-compare';
import { runAllGenerators } from '@/lib/data-room/run-all-generators';
import { recordRegenerationAction } from '@/lib/data-room/record-cron-action';

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
  const generatedAt = new Date().toISOString();

  // Emit a single agent_actions row capturing the cron firing — lights up
  // GlobalStatusBar + ActivityLog so the operator notices when the daily
  // run stops happening or starts partially failing.
  await recordRegenerationAction({
    supabase,
    trigger: 'cron',
    results,
    generatedAt,
  });

  return NextResponse.json(
    {
      ok: allOk,
      generated_at: generatedAt,
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
