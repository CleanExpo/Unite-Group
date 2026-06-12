// POST /api/empire/data-room/regenerate
//
// Admin entry point — wraps runAllGenerators with founder-auth instead of
// the cron-secret. Used by the "Regenerate all" button in the data-room
// admin console.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import { runAllGenerators } from '@/lib/data-room/run-all-generators';
import { recordRegenerationAction } from '@/lib/data-room/record-cron-action';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const results = await runAllGenerators({ supabase });
  const allOk = results.every((r) => r.ok);
  const generatedAt = new Date().toISOString();

  // Mirror the cron path: emit an agent_actions row so GlobalStatusBar +
  // ActivityLog reflect the manual regeneration too.
  await recordRegenerationAction({
    supabase,
    trigger: 'admin',
    results,
    generatedAt,
    actorEmail: gate.actorEmail,
  });

  return NextResponse.json(
    {
      ok: allOk,
      generated_at: generatedAt,
      actor_email: gate.actorEmail,
      results,
    },
    { status: allOk ? 200 : 207, headers: { 'Cache-Control': 'no-store' } },
  );
}
