import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { listRecentSessions } from '@/lib/command-centre/sessions'
import { buildLiveAgentOperations } from '@/lib/command-centre/live-agent-operations'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const [tasks, sessions] = await Promise.all([
      listTasks({ founderId: user.id, limit: 100 }),
      listRecentSessions({ founderId: user.id, limit: 100 }),
    ])
    return NextResponse.json(buildLiveAgentOperations(tasks, sessions), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'cc_operations_unavailable' }, { status: 503 })
  }
}
