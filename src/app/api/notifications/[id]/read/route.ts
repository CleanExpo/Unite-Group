/**
 * SYN-525: PATCH /api/notifications/[id]/read — mark notification as read
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabase
    .from('client_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', session.user.id); // RLS guard: can only mark own notifications read

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
