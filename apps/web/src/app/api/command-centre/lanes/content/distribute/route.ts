// POST /api/command-centre/lanes/content/distribute — gated publish of generated content to social posts
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { runContentDistribute } from '@/lib/command-centre/lanes/content-distribute'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { taskId?: string; scheduledAt?: string }
  try {
    body = (await request.json()) as { taskId?: string; scheduledAt?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.taskId) {
    return NextResponse.json({ error: 'Missing required field: taskId' }, { status: 400 })
  }

  try {
    const result = await runContentDistribute({
      founderId: user.id,
      taskId: body.taskId,
      scheduledAt: body.scheduledAt,
    })
    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Content distribute failed' },
      { status: 500 },
    )
  }
}
