// POST /api/telegram/approval-callback — Telegram inline-button decision webhook.
//
// WS2 P5: closes the Margot loop. A signed approve/reject button press is
// verified, then routed THROUGH the approval gate (approve → send via
// gmail.sendReply; reject → rejected). Replaces the former 501 stub — the
// decision path is now the tested lib/margot gate, not the un-ported empire
// ledger. DORMANT until MARGOT_DRAFTS_ENABLED=true and the margot migration is
// applied. No autonomous send — a draft only sends on an explicit approval.
//
// Webhook auth (not session): the HMAC-signed callback_data (forgery-proof) +
// the founder chat-id allowlist. Founder actor = FOUNDER_USER_ID (single-tenant).

import { NextRequest, NextResponse } from 'next/server';

import { createMargotDraftStore } from '@/lib/margot/draft-store';
import { sendStoredDraft } from '@/lib/margot/providers';
import { handleTelegramDecision } from '@/lib/margot/telegram-approval';

export const dynamic = 'force-dynamic';

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const signingKey = process.env.TELEGRAM_DECISION_SIGNING_KEY;
  if (!token || !signingKey) {
    return NextResponse.json(
      {
        ok: false,
        code: 'ERR_INTERNAL',
        reason:
          'TELEGRAM_BOT_TOKEN / TELEGRAM_DECISION_SIGNING_KEY not configured',
      },
      { status: 503 }
    );
  }

  if (process.env.MARGOT_DRAFTS_ENABLED !== 'true') {
    return NextResponse.json({
      ok: false,
      dormant: true,
      reason: 'MARGOT_DRAFTS_ENABLED is not true',
    });
  }

  const founderId = process.env.FOUNDER_USER_ID;
  if (!founderId) {
    return NextResponse.json(
      { ok: false, reason: 'FOUNDER_USER_ID not set' },
      { status: 500 }
    );
  }

  const update = (await req.json().catch(() => null)) as {
    callback_query?: {
      id: string;
      data?: string;
      message?: { chat?: { id?: number | string } };
    };
  } | null;

  const cq = update?.callback_query;
  if (!cq?.data) {
    return NextResponse.json({ ok: false, reason: 'no callback decision' });
  }

  // Only accept decisions from the founder's own chat.
  const chatId = String(cq.message?.chat?.id ?? '');
  if (process.env.TELEGRAM_CHAT_ID && chatId !== process.env.TELEGRAM_CHAT_ID) {
    return NextResponse.json(
      { ok: false, reason: 'chat not permitted' },
      { status: 403 }
    );
  }

  const store = createMargotDraftStore();
  const result = await handleTelegramDecision(cq.data, signingKey, founderId, {
    getDraft: id => store.getDraft(id, founderId),
    send: async draft => {
      const stored = await store.getDraft(draft.id, founderId);
      if (!stored) throw new Error('draft no longer available to send');
      await sendStoredDraft(stored, draft);
    },
    record: approval => store.recordApproval(approval, founderId),
    markSent: id => store.markSent(id),
    persistRejected: id => store.markRejected(id),
  });

  await answerCallback(
    token,
    cq.id,
    result.ok
      ? result.action === 'approve'
        ? 'Approved and sent.'
        : 'Rejected.'
      : `No action: ${result.reason ?? 'unavailable'}`
  );

  return NextResponse.json(result);
}
