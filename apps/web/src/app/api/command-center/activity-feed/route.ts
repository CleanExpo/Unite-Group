import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { buildActivityFeed } from '@/lib/command-centre/activity-feed'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const tasks = await listTasks({ founderId: user.id, limit: 100 })
    return NextResponse.json(buildActivityFeed(tasks), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'cc_activity_unavailable' }, { status: 503 })
  }
}
