// POST /api/margot/drafts/[id]/approve
// WS2 P2 — approve a draft and send it, THROUGH the approval gate. DORMANT:
// no-ops unless MARGOT_DRAFTS_ENABLED=true and the migration is applied. The
// only send path; an unapproved draft can never be transmitted (assertSendable).

import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { createMargotDraftStore } from '@/lib/margot/draft-store';
import { approveAndSend } from '@/lib/margot/send-on-approval';
import { sendStoredDraft } from '@/lib/margot/providers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.MARGOT_DRAFTS_ENABLED !== 'true') {
    return NextResponse.json({
      dormant: true,
      message: 'MARGOT_DRAFTS_ENABLED is not true — Margot drafts are dormant',
    });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const store = createMargotDraftStore();
  const stored = await store.getDraft(id, user.id);
  if (!stored) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    via?: 'telegram' | 'ui';
    note?: string;
  };
  const via = body.via === 'telegram' ? 'telegram' : 'ui';

  try {
    const { draft } = await approveAndSend(
      stored,
      user.id,
      via,
      {
        send: d => sendStoredDraft(stored, d),
        record: approval => store.recordApproval(approval, user.id),
        markSent: draftId => store.markSent(draftId),
      },
      body.note
    );
    return NextResponse.json({ ok: true, status: draft.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'approve/send failed' },
      { status: 400 }
    );
  }
}
