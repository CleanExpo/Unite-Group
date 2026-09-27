import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { resolveMissionAuthority } from '@/lib/mission-authority/continuation'
import { buildMissionAuthorityView } from '@/lib/mission-authority/authority-view'
import { loadInterruptionLedger } from '@/lib/mission-authority/interruptions'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const taskIdSchema = z.string().uuid()

/**
 * UNI-2779 — the mission's authority and continuation, as the runner sees it,
 * plus the founder's interruption metric. Read-only. No release evidence is
 * read here, so no safe-release gate is ever reported as proven.
 */
export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const taskId = taskIdSchema.safeParse(new URL(request.url).searchParams.get('taskId'))
  if (!taskId.success) return NextResponse.json({ error: 'Provide a valid taskId.' }, { status: 400, headers })
  try {
    const task = await getTaskById({ founderId: user.id, taskId: taskId.data })
    if (!task || task.founder_id !== user.id) return NextResponse.json({ error: 'Mission not found' }, { status: 404, headers })
    const authority = await resolveMissionAuthority(task)
    const view = buildMissionAuthorityView(task, authority, Date.now())
    const { metric, truncated } = await loadInterruptionLedger(user.id)
    return NextResponse.json({ view, interruptions: { metric, truncated } }, { headers })
  } catch {
    return NextResponse.json({ error: 'Mission authority could not be read. Try again later.' }, { status: 500, headers })
  }
}
