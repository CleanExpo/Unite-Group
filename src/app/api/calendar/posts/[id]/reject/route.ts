import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { client_id } = body as { client_id: string };

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const { id } = await params;
  const slotId = id;

  // Fetch the calendar that owns this slot, verifying user ownership
  const { data: calendar, error: fetchError } = await supabase
    .from('content_calendars')
    .select('id, slots, client_id')
    .eq('client_id', client_id)
    .single();

  if (fetchError || !calendar) {
    return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
  }

  // Verify the authenticated user owns this calendar via profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .eq('client_id', client_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update the specific slot's status in the JSONB array
  const slots = calendar.slots as any[];
  const updatedSlots = slots.map((slot: any) => {
    if (slot.slot_id === slotId) {
      return { ...slot, status: 'rejected' };
    }
    return slot;
  });

  const { error: updateError } = await supabase
    .from('content_calendars')
    .update({ slots: updatedSlots })
    .eq('id', calendar.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
