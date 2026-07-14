// GET  /api/kanban/cards — list the founder's own board cards (grouped by status)
// POST /api/kanban/cards — create a card
//
// WS2 P3: the OWN editable board (not the read-only Linear projection). Founder
// session auth + founder_id scoping. Works once the kanban_task migration is
// applied.

import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { listTasks, createTask } from '@/lib/kanban/store';
import { COLUMNS, type TaskStatus } from '@/types/kanban';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(COLUMNS.map(c => c.id));

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const tasks = await listTasks(user.id);
  const columns = COLUMNS.map(c => ({
    ...c,
    tasks: tasks.filter(t => t.status === c.id),
  }));
  return NextResponse.json({ columns });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    status?: TaskStatus;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    description?: string;
    businessKey?: string;
    sourceMessageId?: string;
    sourceDraftId?: string;
  } | null;

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (body.status && !STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const id = await createTask(user.id, {
    title: body.title.trim(),
    status: body.status,
    priority: body.priority,
    description: body.description,
    businessKey: body.businessKey,
    sourceMessageId: body.sourceMessageId,
    sourceDraftId: body.sourceDraftId,
  });
  return NextResponse.json({ id, status: body.status ?? 'todo' }, { status: 201 });
}
