import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { getStripe } from '@/lib/integrations/stripe/client'
import { getDeliveryProjectByName } from '@/lib/command-centre/delivery-projects'
import { readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { DeliveryConflict, DeliveryNotFound, getApprovedDelivery, verifyDeliveryApproval } from '@/lib/command-centre/delivery-store'
import { toDeliveryMissionView } from '@/lib/command-centre/delivery-view'
import {
  applyLifecycleCommand, createLifecycleHandoff, lifecycleCommandSchema,
  LifecycleConflict, readIdeaLifecycle, toLifecycleView,
} from '@/lib/command-centre/idea-lifecycle'
import {
  captureIdeaLifecycle, getIdeaLifecycleTask, saveIdeaLifecycle, saveLifecycleProof, readTrustedLifecycleObservations,
} from '@/lib/command-centre/idea-lifecycle-store'
import { observeIdeaLifecycle } from '@/lib/command-centre/idea-lifecycle-observations'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const taskIdSchema = z.string().uuid()
const refreshSchema = z.object({
  action: z.literal('refresh_proof'), taskId: taskIdSchema, expectedRevision: z.number().int().positive(),
}).strict()

async function readBoundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Missing body')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let body = ''
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 1024 * 1024) {
        await reader.cancel()
        throw new Error('Body exceeds limit')
      }
      body += decoder.decode(chunk.value, { stream: true })
    }
    return JSON.parse(body + decoder.decode()) as unknown
  } finally { reader.releaseLock() }
}

function representation(task: CommandCentreTask, compact = false) {
  const lifecycle = readIdeaLifecycle(task.metadata)
  if (!lifecycle) throw new DeliveryNotFound()
  const observations = readTrustedLifecycleObservations(task)
  const progress = toLifecycleView(lifecycle, observations)
  if (compact) return {
    taskId: task.id, source: 'supabase', progress,
    lifecycle: {
      kind: lifecycle.kind, title: lifecycle.title, revision: lifecycle.revision,
      checkpoint: lifecycle.checkpoint ? { status: lifecycle.checkpoint.status, summary: lifecycle.checkpoint.summary, nextStep: lifecycle.checkpoint.nextStep } : null,
      mandate: lifecycle.mandate ? { maximumSources: lifecycle.mandate.maximumSources } : null,
      sources: lifecycle.sources.map(source => ({ id: source.id })),
      brief: lifecycle.brief ? { hash: lifecycle.brief.hash, snapshot: { revision: lifecycle.brief.snapshot.revision } } : null,
      approval: lifecycle.approval ? { scope: lifecycle.approval.scope, revision: lifecycle.approval.revision, briefHash: lifecycle.approval.briefHash } : null,
    },
  }
  return {
    taskId: task.id, lifecycle, progress,
    handoff: lifecycle.brief?.snapshot.revision === lifecycle.revision ? createLifecycleHandoff(lifecycle) : null,
    mission: toDeliveryMissionView(task), source: 'supabase',
  }
}

function failure(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'The lifecycle input is invalid or exceeds the saved-state limit.' }, { status: 400, headers })
  if (error instanceof DeliveryNotFound) return NextResponse.json({ error: 'Mission not found' }, { status: 404, headers })
  if (error instanceof DeliveryConflict || error instanceof LifecycleConflict) {
    return NextResponse.json({ error: error.message || 'This mission changed. Reload before continuing.' }, { status: 409, headers })
  }
  return NextResponse.json({
    error: 'The idea could not be saved or confirmed. Reload the mission before retrying.', source: 'error',
  }, { status: 503, headers })
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const params = new URL(request.url).searchParams
  const taskId = taskIdSchema.safeParse(params.get('taskId'))
  if (!taskId.success) return NextResponse.json({ error: 'Provide a valid taskId.' }, { status: 400, headers })
  if (params.has('view') && params.get('view') !== 'status') return NextResponse.json({ error: 'Use view=status for a compact status response.' }, { status: 400, headers })
  try {
    return NextResponse.json(representation(await getIdeaLifecycleTask(user.id, taskId.data), params.get('view') === 'status'), { headers })
  } catch (error) { return failure(error) }
}

/** Cookie-authenticated HTTP contract is shared by the founder UI and terminal clients. */
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  const origin = request.headers.get('origin')
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) {
    return NextResponse.json({ error: 'Cross-origin lifecycle writes are not permitted.' }, { status: 403, headers })
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return NextResponse.json({ error: 'Use application/json for lifecycle requests.' }, { status: 400, headers })
  }
  let raw: unknown
  try { raw = await readBoundedJson(request) } catch {
    return NextResponse.json({ error: 'Provide valid JSON within the 1 MiB request limit.' }, { status: 400, headers })
  }
  const refresh = refreshSchema.safeParse(raw)
  const command = lifecycleCommandSchema.safeParse(raw)
  if (!refresh.success && !command.success) return NextResponse.json({
    error: 'Provide a valid lifecycle request. Provider evidence and actor identity cannot be submitted.',
  }, { status: 400, headers })
  try {
    const context = { actorId: user.id, now: new Date().toISOString() }
    if (refresh.success) {
      const input = refresh.data
      const task = await getIdeaLifecycleTask(user.id, input.taskId)
      const lifecycle = readIdeaLifecycle(task.metadata)!
      if (lifecycle.revision !== input.expectedRevision) throw new DeliveryConflict()
      const delivery = readDeliveryMetadata(task)
      const project = delivery?.projectKey ? await getDeliveryProjectByName(delivery.projectKey) : undefined
      const observations = await observeIdeaLifecycle(task, project, lifecycle.outcome, {
        token: process.env.GITHUB_TOKEN, stripe: getStripe(),
        deliveryAuthorityVerified: !!getApprovedDelivery(task) && await verifyDeliveryApproval(task),
      })
      const saved = await saveLifecycleProof(task, observations, input.expectedRevision)
      return NextResponse.json(representation(saved), { headers })
    }
    if (!command.success) throw new Error('Validated request unavailable')
    const input = command.data
    if (input.action === 'capture') {
      const { task, deduplicated } = await captureIdeaLifecycle(user.id, {
        rawIdea: input.rawIdea, title: input.title, requestId: input.requestId,
      }, context)
      return NextResponse.json({ ...representation(task), deduplicated }, { headers })
    }
    const task = await getIdeaLifecycleTask(user.id, input.taskId)
    const lifecycle = readIdeaLifecycle(task.metadata)!
    if (lifecycle.revision !== input.expectedRevision) throw new DeliveryConflict()
    const updated = applyLifecycleCommand(lifecycle, input, context)
    const saved = await saveIdeaLifecycle(task, updated, input.expectedRevision)
    return NextResponse.json(representation(saved), { headers })
  } catch (error) { return failure(error) }
}
