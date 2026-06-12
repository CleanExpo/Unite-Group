// POST /api/telegram/send — send a message to the configured Telegram chat.
//
// Ported from apps/authority-legacy/src/app/api/telegram/send/route.ts (P4 —
// docs/convergence/migration-map.md).
//
// ADAPTATION (apps/web):
//   - The legacy route gated via requireAdmin() from @/lib/security/require-admin,
//     which is not present in apps/web. Replaced with apps/web's standard
//     getUser() + 401 auth gate (single-tenant founder).
//   - Uses createServiceClient() for the best-effort persist.
//   - The `telegram_messages` table is NOT migrated in apps/web. The send to
//     Telegram still works (env-configured); the persist degrades silently
//     (best-effort, as in the source) and logs a not_connected note if the
//     table is absent. TODO(convergence): migrate telegram_messages.
//     See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Auth gate — founder-only (apps/web convention).
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text, persist } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json(
      { error: 'not_connected', reason: 'Telegram not configured' },
      { status: 503 },
    );
  }

  // 1. Send to Telegram.
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });

  const data = await res.json();
  if (!data.ok) {
    return NextResponse.json({ error: data.description }, { status: 400 });
  }

  // 2. Best-effort persist so the CRM feed shows it without waiting for a hook.
  if (persist) {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from('telegram_messages').insert({
        chat_id: chatId,
        session_id: 'crm-direct',
        platform: 'telegram',
        sender_name: 'Phill',
        is_from_bot: false,
        message: text.slice(0, 2000),
        response: null,
      });
      if (error && (error as { code?: string }).code === '42P01') {
        console.warn(
          '[telegram send] not_connected: telegram_messages not migrated in apps/web; ' +
            'message was delivered to Telegram but not persisted.',
        );
      }
    } catch {
      // Non-fatal — message was sent to Telegram, Supabase write is best-effort.
    }
  }

  return NextResponse.json({ ok: true, message_id: data.result?.message_id });
}
