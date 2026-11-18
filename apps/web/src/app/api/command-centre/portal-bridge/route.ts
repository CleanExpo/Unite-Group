// POST /api/command-centre/portal-bridge
//
// Links every client project item that has no task yet to exactly one cc_tasks row (lib/portal/projects/bridge.ts).
// cc_tasks stays the single task authority; the portal item is the client's view of it. Tasks are born `proposed`
// with human approval required, so nothing here can approve, queue, merge, release or spend.
//
// Auth: a valid CRON_SECRET (machine caller) or a session whose user IS the founder (FOUNDER_USER_ID). Any other
// signed-in account, including a portal client, is refused. Not configured = refused, never open.
// Writes use the service-role client, only after that check, with founder_id set explicitly on every task.

import { NextResponse } from 'next/server'

import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { isCronAuthorised } from '@/lib/cron-auth'
import type { SupabaseLike } from '@/lib/command-centre/tasks'
import { sanitiseError } from '@/lib/error-reporting'
import { bridgeItems, type BridgeItem } from '@/lib/portal/projects/bridge'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const BATCH = 100
const ITEM_COLUMNS = 'id, tenant_slug, project_id, kind, title, client_text, source, source_ref, author_kind, cc_task_id'

export async function POST(request: Request): Promise<Response> {
  const founderId = getFounderUserId()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 503 })
  if (!isCronAuthorised(request)) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    if (user.id !== founderId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('portal_project_items' as never)
      .select(ITEM_COLUMNS)
      .is('cc_task_id', null)
      .order('created_at', { ascending: true })
      .limit(BATCH)
    // A failed read is a failure, never "nothing to do".
    if (error || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Could not read portal project items' }, { status: 502 })
    }
    const summary = await bridgeItems(data as unknown as BridgeItem[], founderId, {
      tasksDb: service as unknown as SupabaseLike,
      async linkTask(itemId, taskId) {
        const r = await service.rpc('portal_team_link_project_task' as never, { p_item_id: itemId, p_task_id: taskId } as never)
        return r.error ? { ok: false, message: r.error.message } : { ok: true }
      },
    })
    const status = summary.failures.length > 0 ? 207 : 200
    return NextResponse.json({ ...summary, batchFull: data.length === BATCH }, { status })
  } catch (error) {
    return NextResponse.json({ error: sanitiseError(error, 'Portal bridge failed') }, { status: 500 })
  }
}
