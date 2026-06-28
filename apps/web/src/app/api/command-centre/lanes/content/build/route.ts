// POST /api/command-centre/lanes/content/build — trigger content build for a task
import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { runContentBuild } from '@/lib/command-centre/lanes/content-build'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { taskId?: string }
  try {
    body = (await request.json()) as { taskId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.taskId) {
    return NextResponse.json({ error: 'Missing required field: taskId' }, { status: 400 })
  }

  try {
    const result = await runContentBuild({ founderId: user.id, taskId: body.taskId })
    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Content build failed') },
      { status: 500 },
    )
  }
}
