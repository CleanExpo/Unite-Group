import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { mode } = body as { mode: 'shadow' | 'live' };

  if (!mode || !['shadow', 'live'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode. Must be shadow or live.' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ calendar_mode: mode })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update calendar mode' }, { status: 500 });
  }

  return NextResponse.json({ success: true, mode });
}
