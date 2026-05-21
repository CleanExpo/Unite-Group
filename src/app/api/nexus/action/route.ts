import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, action, data } = body;

    if (!cardId || !action) {
      return NextResponse.json({ error: 'Missing cardId or action' }, { status: 400 });
    }

    const supabase = getAdminClient();

    let updateData: any = {};
    let historyAction = action;

    switch (action) {
      case 'approve':
        updateData = { approval_status: 'approved', approval_reason: data?.note || 'Approved via Nexus' };
        break;
      case 'reject':
        updateData = { approval_status: 'rejected', rejection_reason: data?.note || 'Rejected via Nexus' };
        break;
      case 'request_changes':
        updateData = { approval_status: 'changes_requested', founder_notes: data?.note };
        break;
      case 'block':
        updateData = { 
          is_blocked: true, 
          blocked_reason: data?.blockReason || 'Blocked via Nexus',
          blocked_since: new Date().toISOString()
        };
        break;
      case 'set_priority':
        updateData = { priority: data?.priority };
        break;
      case 'add_note':
        updateData = { founder_notes: data?.note };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the card
    const { error: cardError } = await supabase
      .from('nexus_cards')
      .update({ ...updateData, last_updated: new Date().toISOString() })
      .eq('id', cardId);

    if (cardError) {
      console.error('Card update error:', cardError);
      return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
    }

    // Log to evidence history
    await supabase.from('nexus_card_history').insert({
      card_id: cardId,
      action: historyAction,
      actor: 'Founder',
      details: data,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Nexus action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
