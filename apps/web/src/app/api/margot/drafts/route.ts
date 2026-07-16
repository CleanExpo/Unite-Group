// POST /api/margot/drafts
// WS2 P2 — generate a founder-VOICE reply draft for a message and store it
// `awaiting_approval`. DORMANT: no-ops unless MARGOT_DRAFTS_ENABLED=true and the
// margot_email_draft migration is applied. Never sends — drafts only.

import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { generateFounderDraft } from '@/lib/margot/draft-reply';
import { createAnthropicComplete } from '@/lib/margot/providers';
import { createMargotDraftStore } from '@/lib/margot/draft-store';
import { getAccountVoice } from '@/lib/margot/account-voice';
import type { IncomingEmail } from '@/lib/margot/draft-reply-prompt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

  const input = (await request.json().catch(() => null)) as {
    incoming?: IncomingEmail;
    accountEmail?: string;
    threadId?: string;
    toAddress?: string;
    subject?: string;
    sourceMessageId?: string;
    businessKey?: string;
  } | null;

  if (!input?.incoming?.body || !input?.accountEmail) {
    return NextResponse.json(
      { error: 'incoming email and accountEmail are required' },
      { status: 400 }
    );
  }

  try {
    // Resolve the copywriter voice for the account we're drafting FROM — the
    // stored per-account voice, or the labelled default when none is set.
    const voice = await getAccountVoice(user.id, input.accountEmail);
    const body = await generateFounderDraft(
      input.incoming,
      voice,
      createAnthropicComplete()
    );
    const store = createMargotDraftStore();
    const id = await store.createDraft({
      founderId: user.id,
      businessKey: input.businessKey,
      accountEmail: input.accountEmail,
      sourceMessageId: input.sourceMessageId,
      threadId: input.threadId,
      toAddress: input.toAddress,
      subject: input.subject ?? input.incoming.subject,
      body,
      voiceMeta: { voiceName: voice.name },
    });
    return NextResponse.json({ id, status: 'awaiting_approval', body });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'draft generation failed' },
      { status: 500 }
    );
  }
}
