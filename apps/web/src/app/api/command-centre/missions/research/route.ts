import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { DeliveryConflict, DeliveryNotFound } from '@/lib/command-centre/delivery-store'
import { researchStartSchema, researchCancelSchema, researchRetrySchema, ResearchConflict } from '@/lib/command-centre/idea-research'
import {
  readIdeaResearch, startIdeaResearch, changeIdeaResearch, readSignedResearchRun, researchSigningAvailable,
  readBoundedResearchJson,
} from '@/lib/command-centre/idea-research-store'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const schema = z.discriminatedUnion('action', [researchStartSchema, researchCancelSchema, researchRetrySchema])
const taskIdSchema = z.string().uuid()

function representation(task: CommandCentreTask, authorityCurrent: boolean) {
  const research = readSignedResearchRun(task)
  return {
    taskId: task.id, research: research ? { ...research, lease: research.lease ? { runnerId: research.lease.runnerId, expiresAt: research.lease.expiresAt } : null } : null,
    authorityCurrent, source: 'supabase',
    readiness: { signingAvailable: researchSigningAvailable(), runnerConnection: 'unknown', subscriptionAllowance: 'unknown', paidApiFallback: false },
  }
}

function failure(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'Research input is invalid or exceeds its saved-state limit.' }, { status: 400, headers })
  if (error instanceof DeliveryNotFound) return NextResponse.json({ error: 'Mission not found' }, { status: 404, headers })
  if (error instanceof DeliveryConflict || error instanceof ResearchConflict) return NextResponse.json({ error: error.message }, { status: 409, headers })
  return NextResponse.json({ error: 'Research could not be saved or confirmed. Reload before retrying.', source: 'error' }, { status: 503, headers })
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const taskId = taskIdSchema.safeParse(new URL(request.url).searchParams.get('taskId'))
  if (!taskId.success) return NextResponse.json({ error: 'Provide a valid taskId.' }, { status: 400, headers })
  try {
    const loaded = await readIdeaResearch(user.id, taskId.data)
    return NextResponse.json(representation(loaded.task, loaded.authorityCurrent), { headers })
  } catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const origin = request.headers.get('origin')
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) return NextResponse.json({ error: 'Cross-origin research writes are not permitted.' }, { status: 403, headers })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return NextResponse.json({ error: 'Use application/json.' }, { status: 400, headers })
  let raw: unknown
  try { raw = await readBoundedResearchJson(request) } catch { return NextResponse.json({ error: 'Provide valid JSON within the 1 MiB request limit.' }, { status: 400, headers }) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Provide a valid research request; actor, provider proof and lease credentials cannot be submitted.' }, { status: 400, headers })
  try {
    const input = parsed.data
    const changed = input.action === 'start' ? await startIdeaResearch(user.id, input) : { task: await changeIdeaResearch(user.id, input) }
    const loaded = await readIdeaResearch(user.id, changed.task.id)
    return NextResponse.json({ ...representation(loaded.task, loaded.authorityCurrent), ...('deduplicated' in changed ? { deduplicated: changed.deduplicated } : {}) }, { headers })
  } catch (error) { return failure(error) }
}
