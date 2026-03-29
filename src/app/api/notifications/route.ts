/**
 * SYN-525: GET /api/notifications — list current user's notifications
 */
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: notifications, error } = await supabase
    .from('client_notifications')
    .select('*')
    .eq('client_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unreadCount = (notifications ?? []).filter(n => !n.read).length;

  return NextResponse.json({ notifications: notifications ?? [], unreadCount });
}
