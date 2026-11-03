// PATCH /api/kanban/cards/[id]/move — move a card to a column at an index.
// WS2 P3 (own board). Founder session auth + founder_id scoping. Fractional
// ordering means one position write, no reindexing.

import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { moveTask } from '@/lib/kanban/store';
import { sanitiseError } from '@/lib/error-reporting';
import { COLUMNS, type TaskStatus } from '@/types/kanban';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(COLUMNS.map(c => c.id));

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: TaskStatus;
    index?: number;
  } | null;

  if (!body?.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'valid status is required' }, { status: 400 });
  }
  const index = Number.isInteger(body.index) ? (body.index as number) : 0;

  let moved: boolean;
  try {
    moved = await moveTask(user.id, id, body.status, index);
  } catch (e) {
    return NextResponse.json(
      { error: sanitiseError(e, 'Failed to move card', { route: 'kanban/cards/[id]/move' }) },
      { status: 500 }
    );
  }
  if (!moved) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, status: body.status, index });
}
