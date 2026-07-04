// src/app/api/command-centre/lanes/wiki/enhance/route.ts
//
// POST /api/command-centre/lanes/wiki/enhance — enqueue a Wiki Knowledge Base
//   enhancement run (operator_jobs task_type 'wiki_enhance'); dedupes onto the
//   active job when one is already planned/queued/running.
// GET  — latest wiki-enhance job + recent events, for the button status readout.
//
// Thin route: auth → delegate → respond. Mirrors lanes/software/build/route.ts.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { enqueueWikiEnhance, latestWikiEnhance } from '@/lib/command-centre/lanes/wiki-enhance'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const result = await enqueueWikiEnhance(user.id)
    return NextResponse.json(result, { status: result.deduped ? 200 : 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const status = await latestWikiEnhance(user.id)
    return NextResponse.json(status, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
