import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { getBusinessByKey, type BusinessKey } from '@/lib/businesses'
import { getTaskById } from '@/lib/command-centre/tasks'
import { isDeliveryMission } from '@/lib/command-centre/delivery-types'
import { saveMissionBusiness } from '@/lib/command-centre/mission-business-store'
import { DeliveryConflict } from '@/lib/command-centre/delivery-store'
import { toDeliveryMissionView } from '@/lib/command-centre/delivery-view'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const schema = z.object({ taskId: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }), businessKey: z.string().max(80).nullable() }).strict()

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-origin request refused.' }, { status: 403, headers })
  let raw: unknown
  try { raw = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers }) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success || (parsed.data.businessKey !== null && !getBusinessByKey(parsed.data.businessKey))) {
    return NextResponse.json({ error: 'Choose a registered business and refresh the mission before saving.' }, { status: 400, headers })
  }
  try {
    const task = await getTaskById({ founderId: user.id, taskId: parsed.data.taskId })
    if (!task || task.founder_id !== user.id || !isDeliveryMission(task)) return NextResponse.json({ error: 'Mission not found.' }, { status: 404, headers })
    if (task.updated_at !== parsed.data.expectedUpdatedAt) throw new DeliveryConflict()
    const saved = await saveMissionBusiness(task, parsed.data.businessKey as BusinessKey | null)
    return NextResponse.json({ mission: toDeliveryMissionView(saved), source: 'supabase' }, { headers })
  } catch (error) {
    if (error instanceof DeliveryConflict) return NextResponse.json({ error: error.message }, { status: 409, headers })
    return NextResponse.json({ error: 'The business assignment could not be saved or confirmed. Refresh before retrying.', source: 'error' }, { status: 503, headers })
  }
}
