import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { buildReviewPatch, NotReviewableError, type ReviewAction } from '@/lib/coaching/review'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PATCH /api/coaching/extractions/:id
 *
 * Applies one review decision — approve (optionally with an edit) or reject.
 * The decision itself lives in lib/coaching/review.ts so it is testable without
 * a database; this route is the transport plus the tenancy boundary.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 })

  // A non-UUID can never match a row; Postgres would raise 22P02 and that would
  // surface as a 500 for what is really a malformed request.
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { action, body: editedBody } = (body ?? {}) as { action?: string; body?: unknown }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }
  if (editedBody !== undefined && typeof editedBody !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = await createClient()

  // Read the current row FIRST. The correction log needs to know what the model
  // originally proposed, and the status guard needs to know this row is still
  // 'proposed' — neither can be inferred from the request.
  const { data: row, error: readError } = await supabase
    .from('coaching_extractions')
    .select('id, status, body, original_body')
    .eq('founder_id', user.id)
    .eq('id', id)
    .maybeSingle()

  if (readError) {
    console.error('[coaching/extractions] read failed:', readError.message)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let patch
  try {
    patch = buildReviewPatch(row, action as ReviewAction, editedBody)
  } catch (e) {
    if (e instanceof NotReviewableError) {
      // Someone else already decided this one, or the page is stale.
      return NextResponse.json({ error: 'not_reviewable', detail: e.message }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'invalid_decision', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 400 },
    )
  }

  const { data: written, error: writeError } = await supabase
    .from('coaching_extractions')
    .update(patch)
    .eq('founder_id', user.id)
    .eq('id', id)
    // Only a still-proposed row may be written. Without this the read-then-write
    // above is a race: two tabs could both pass the status guard and the second
    // would overwrite the first decision.
    .eq('status', 'proposed')
    // The rows are SELECTED BACK because a 0-row update is not an error.
    // PostgREST returns success with an empty set, so checking only
    // `writeError` reported a decision as saved when the guard above had
    // silently matched nothing — the client then showed an approval that
    // never persisted. Found in independent review (P1).
    .select('id')

  if (writeError) {
    console.error('[coaching/extractions] write failed:', writeError.message)
    return NextResponse.json({ error: 'write_failed' }, { status: 500 })
  }

  if (!written || written.length === 0) {
    // Someone else decided it between our read and our write, or the page is
    // stale. Say so rather than claiming a save that did not happen.
    return NextResponse.json(
      { error: 'not_reviewable', detail: 'already decided — reload' },
      { status: 409 },
    )
  }

  return NextResponse.json({ id, status: patch.status })
}
