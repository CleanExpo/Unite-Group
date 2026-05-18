// GET    /api/empire/data-room/[id]      — full document incl. payload
// PATCH  /api/empire/data-room/[id]      — update audit_status (approve/reject/supersede)
//
// Founder-only. UNI-1989.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_AUDIT_STATUSES = new Set([
  'pending',
  'approved',
  'rejected',
  'superseded',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = getAdminClient();
  const res = await supabase
    .from('data_room_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (res.error) {
    return NextResponse.json(
      { error: 'data_room_query_failed', detail: res.error.message },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { document: res.data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const audit_status =
    body && typeof body === 'object' && 'audit_status' in body
      ? (body as { audit_status: unknown }).audit_status
      : null;

  if (typeof audit_status !== 'string' || !ALLOWED_AUDIT_STATUSES.has(audit_status)) {
    return NextResponse.json(
      {
        error: 'invalid_audit_status',
        allowed: [...ALLOWED_AUDIT_STATUSES],
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = getAdminClient();
  const res = await supabase
    .from('data_room_documents')
    .update({ audit_status })
    .eq('id', id)
    .select('id, audit_status, updated_at')
    .single();

  if (res.error || !res.data) {
    return NextResponse.json(
      { error: 'data_room_update_failed', detail: res.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ document: res.data });
}
