// GET /api/telegram/feed — recent Telegram conversation turns for the CRM feed.
//
// Ported from apps/authority-legacy/src/app/api/telegram/feed/route.ts (P4 —
// docs/convergence/migration-map.md).
//
// ADAPTATION (apps/web):
//   - Uses createServiceClient() (@/lib/supabase/service) instead of a raw
//     createClient(url, serviceKey).
//   - The `telegram_messages` table is NOT migrated in apps/web. Rather than
//     return fabricated turns, the route reports an honest `not_connected`
//     source with an empty feed when the table is absent (Postgres 42P01).
//     TODO(convergence): migrate telegram_messages. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface FeedTurn {
  id: string;
  from: string;
  text: string;
  ts: string;
  isBot: boolean;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const supabase = createServiceClient();
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);

  const { data, error } = await supabase
    .from('telegram_messages')
    .select('id, sender_name, is_from_bot, message, response, platform, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Honest degradation: missing relation → not_connected, no mock data.
    if ((error as { code?: string }).code === '42P01') {
      return NextResponse.json(
        {
          messages: [],
          total: 0,
          source: 'not_connected',
          reason: 'telegram_messages not migrated in apps/web',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json({ messages: [], error: error.message }, { status: 500 });
  }

  interface TelegramRow {
    id: string | number;
    sender_name: string | null;
    message: string;
    response: string | null;
    created_at: string;
  }

  const turns: FeedTurn[] = [];
  ((data ?? []) as TelegramRow[])
    .slice()
    .reverse()
    .forEach((row) => {
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

  return NextResponse.json(
    {
      messages: turns.slice(-40),
      total: turns.length,
      source: 'telegram_messages',
      fetched_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
