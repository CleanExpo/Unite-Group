// src/app/api/advisory/cases/[id]/re-judge/route.ts
// POST: Recover a case stranded at status='judged' (judge phase failed mid-run)
// by re-running ONLY the Judge phase from the persisted round-5 proposals.
// Ends at status='pending_review'. The full 5-round debate is NOT re-run.
// Step 5 / F4 of the Advisory Debate QA build spec.

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { reJudgeCase } from '@/lib/advisory/debate-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // judge-only — far shorter than a full debate

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  // reJudgeCase enforces the 'judged' precondition and founder scoping itself,
  // and yields an error event (rather than throwing) if the case is ineligible.
  try {
    await reJudgeAsync(id, user.id)
  } catch (err) {
    console.error(`[advisory/re-judge] Re-judge error for case ${id}:`, err)
    return NextResponse.json({ error: 'Re-judge failed — check logs' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Re-judge complete', caseId: id })
}

/**
 * Consumes the re-judge generator and broadcasts events via Supabase Realtime,
 * mirroring the start route so the LiveDebateTab updates the same way.
 */
async function reJudgeAsync(caseId: string, founderId: string) {
  const supabase = createServiceClient()
  const channel = supabase.channel(`advisory:${caseId}`)

  await Promise.race([
    new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') resolve()
      })
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ])

  try {
    for await (const event of reJudgeCase(caseId, founderId)) {
      channel.send({
        type: 'broadcast',
        event: 'debate_event',
        payload: event,
      }).catch(() => { /* ignore broadcast errors */ })
    }
  } finally {
    supabase.removeChannel(channel)
  }
}
