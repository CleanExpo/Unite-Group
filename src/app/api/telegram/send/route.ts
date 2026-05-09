export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { text, persist } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });

  // 1. Send to Telegram
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });

  const data = await res.json();
  if (!data.ok) return NextResponse.json({ error: data.description }, { status: 400 });

  // 2. Write to Supabase immediately so CRM feed shows it without waiting for hook
  if (persist) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('telegram_messages').insert({
        chat_id: chatId,
        session_id: 'crm-direct',
        platform: 'telegram',
        sender_name: 'Phill',
        is_from_bot: false,
        message: text.slice(0, 2000),
        response: null, // Margot's response will be filled by hook when she replies
      });
    } catch {
      // Non-fatal — message was sent to Telegram, Supabase write is best-effort
    }
  }

  return NextResponse.json({ ok: true, message_id: data.result?.message_id });
}
