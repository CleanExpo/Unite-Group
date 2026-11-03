// POST /api/margot/drafts/[id]/approve
// WS2 P2 — approve a draft and send it, THROUGH the approval gate. DORMANT:
// no-ops unless MARGOT_DRAFTS_ENABLED=true and the migration is applied. The
// only send path; an unapproved draft can never be transmitted (assertSendable).

import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { createMargotDraftStore } from '@/lib/margot/draft-store';
import { approveAndSend } from '@/lib/margot/send-on-approval';
import { sendStoredDraft } from '@/lib/margot/providers';
import { ApprovalError } from '@/lib/margot/approval-gate';
import { sanitiseError } from '@/lib/error-reporting';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (process.env.MARGOT_DRAFTS_ENABLED !== 'true') {
    return NextResponse.json({
      dormant: true,
      message: 'MARGOT_DRAFTS_ENABLED is not true — Margot drafts are dormant',
    });
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
    // Gate refusal (draft not approvable/sendable) is the caller's problem: 400.
    if (e instanceof ApprovalError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    // Anything else is a failed record/transmit/status write: 502, detail logged.
    return NextResponse.json(
      { error: sanitiseError(e, 'Failed to send draft', { route: 'margot/drafts/[id]/approve' }) },
      { status: 502 }
    );
  }
}
