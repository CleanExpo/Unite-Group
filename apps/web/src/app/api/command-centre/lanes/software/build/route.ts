// src/app/api/command-centre/lanes/software/build/route.ts
//
// POST /api/command-centre/lanes/software/build
//
// Thin route: auth → validate body → runSoftwareBuild → 200 { result }.
// 401 on unauthenticated; 400 on missing/invalid taskId; 500 on error.
// Mirrors the pattern from src/app/api/command-centre/clarify/route.ts.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { runSoftwareBuild } from '@/lib/command-centre/lanes/software-build'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Body validation ───────────────────────────────────────────────────────
  let body: { taskId?: unknown }
  try {
    body = (await request.json()) as { taskId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  if (!taskId) {
    return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  }

  // ── Delegate to domain logic ───────────────────────────────────────────────
  try {
    const result = await runSoftwareBuild({ founderId: user.id, taskId })
    return NextResponse.json({ result }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
