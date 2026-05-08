import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');

  const { data, error } = await supabase
    .from('telegram_messages')
    .select('id, sender_name, is_from_bot, message, response, platform, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ messages: [], error: error.message });

  // Flatten each row into two turns: user message + bot response
  const turns: Array<{
    id: string; from: string; text: string; ts: string; isBot: boolean;
  }> = [];

  (data || []).reverse().forEach(row => {
    turns.push({
      id: `${row.id}-in`,
      from: row.sender_name || 'Phill',
      text: row.message,
      ts: row.created_at,
      isBot: false,
    });
    if (row.response) {
      turns.push({
        id: `${row.id}-out`,
        from: 'Margot',
        text: row.response,
        ts: row.created_at,
        isBot: true,
      });
    }
  });

  return NextResponse.json({
    messages: turns.slice(-40),
    total: turns.length,
    fetched_at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
