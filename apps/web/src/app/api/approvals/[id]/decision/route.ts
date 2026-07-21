// src/app/api/approvals/[id]/decision/route.ts
//
// Founder decision on an approval_queue row (the /founder/approvals page).
// POST { decision: 'approve' | 'reject' }
//   → transitions the row pending → approved | rejected (write-then-confirm),
//     stamping approved_at (approve) and updated_at.
//
// This records the DECISION only — it never executes the approved action.
// Execution stays with the consumers that watch approval_queue (dormant by
// default; arming is a separate founder gate). Auth-gated (getUser → 401);
// founder-scoped both in the query and by the approval_queue_update RLS
// policy (founder_id = auth.uid(), verified against prod 15/07/2026).

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_DECISIONS = ['approve', 'reject'] as const
type Decision = (typeof VALID_DECISIONS)[number]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  let body: { decision?: unknown }
  try {
    body = (await request.json()) as { decision?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const decision = typeof body.decision === 'string' ? body.decision : ''
  if (!(VALID_DECISIONS as readonly string[]).includes(decision)) {
    return NextResponse.json(
      { error: `Field "decision" must be one of: ${VALID_DECISIONS.join(', ')}` },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // Confirm the row exists, is the founder's, and is still pending before
  // writing — a decided row must 409, not silently re-decide.
  const { data: existing, error: readError } = await supabase
    .from('approval_queue')
    .select('id, status')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (readError || !existing) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }
  if (existing.status !== 'pending') {
    return NextResponse.json(
      { error: `Approval already ${existing.status}` },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const nextStatus = (decision as Decision) === 'approve' ? 'approved' : 'rejected'

  // Write-then-confirm: the update returns the row it changed, never a green
  // 200 over a stale row. maybeSingle keeps the race distinguishable: zero
  // rows (a concurrent decision won between the pre-read and this write) is
  // data:null with no error → 409, while a real write failure → 500.
  // updated_at is the decision timestamp for rejections (approved_at stays null).
  const { data: updated, error: writeError } = await supabase
    .from('approval_queue')
    .update({
      status: nextStatus,
      approved_at: nextStatus === 'approved' ? now : null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('founder_id', user.id)
    .eq('status', 'pending')
    .select('id, status, approved_at, updated_at')
    .maybeSingle()

  if (writeError) {
    return NextResponse.json(
      { error: sanitiseError(writeError, 'Failed to record decision') },
      { status: 500 },
    )
  }
  if (!updated) {
    return NextResponse.json({ error: 'Approval was decided concurrently' }, { status: 409 })
  }

  return NextResponse.json({ approval: updated }, { status: 200 })
}
