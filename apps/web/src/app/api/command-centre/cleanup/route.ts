import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { runCleanup, type CleanupBatch } from '@/lib/command-centre/cleanup-loop'

// UNI-2150 — Mission Control cleanup. Founder-auth. Returns a DRY-RUN assessment
// of a scoped batch (what WOULD be closed/summarised). Live scope→Linear closure
// wiring is a follow-up; the dry-run path never invokes the (unwired) deps.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let batch: CleanupBatch
  try {
    const body = (await request.json()) as { batch?: CleanupBatch } & Partial<CleanupBatch>
    batch = (body.batch ?? (body as CleanupBatch))
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!batch || !batch.scopeId || !Array.isArray(batch.issues)) {
    return NextResponse.json({ error: 'batch_required' }, { status: 400 })
  }

  const result = await runCleanup(batch, {
    closeScope: async () => { throw new Error('live closure not wired') },
    postSummary: async () => { throw new Error('live closure not wired') },
  })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
