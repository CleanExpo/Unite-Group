export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

// Reads Pi-CEO Board directives from Supabase `board_directives` table.
// Replaces the prior implementation that read markdown files from
// ~/Pi-CEO/Pi-Dev-Ops/.harness/board-meetings/ — that path doesn't exist on
// Vercel serverless runtime, so the Board Alerts card was permanently empty
// on production (verified 2026-05-15). The table is populated by the
// /ceo-board skill's Stage 7 write-back and any direct INSERT from session
// work; UI reads from it on every page load.
//
// Admin-auth gate (requireAdmin) preserved from security batch 2b (PR #49).

type DirectiveRow = {
  id: string;
  business_slug: string | null;
  date: string;
  topic: string;
  decision: string;
  directive_to: string;
  status: string;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('board_directives')
      .select('id, business_slug, date, topic, decision, directive_to, status, created_at')
      .eq('status', 'active')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ minutes: [], error: error.message });
    }

    const minutes = (data ?? []).map((row: DirectiveRow) => ({
      date: row.date,
      topic: row.topic.slice(0, 100),
      decision: row.decision.slice(0, 200),
      directiveTo: row.directive_to?.slice(0, 50) ?? null,
      preview: `${row.topic}\n\n${row.decision}`.slice(0, 300),
      business: row.business_slug,
      status: row.status,
    }));

    return NextResponse.json({ minutes });
  } catch (err) {
    return NextResponse.json(
      { minutes: [], error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
