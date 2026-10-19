import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { loadSynthexMissionTimeline } from '@/lib/command-centre/synthex-mission-timeline'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const taskIdSchema = z.string().uuid()

/**
 * SPM-audit G2 — the Synthex witness events recorded for one founder mission,
 * oldest step first, plus recent Synthex events that carried no mission id.
 * Read-only. A failed read is a 500, never an empty timeline.
 */
export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const taskId = taskIdSchema.safeParse(new URL(request.url).searchParams.get('taskId'))
  if (!taskId.success) return NextResponse.json({ error: 'Provide a valid taskId.' }, { status: 400, headers })
  try {
    const task = await getTaskById({ founderId: user.id, taskId: taskId.data })
    if (!task || task.founder_id !== user.id) return NextResponse.json({ error: 'Mission not found' }, { status: 404, headers })
    return NextResponse.json(await loadSynthexMissionTimeline(user.id, task.id), { headers })
  } catch {
    return NextResponse.json({ error: 'Synthex activity could not be read. Try again later.' }, { status: 500, headers })
  }
}
