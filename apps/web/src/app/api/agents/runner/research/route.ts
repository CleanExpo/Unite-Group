import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { DeliveryConflict, DeliveryNotFound, type DeliveryStoreClient } from '@/lib/command-centre/delivery-store'
import { readIdeaLifecycle } from '@/lib/command-centre/idea-lifecycle'
import { ResearchConflict, researchCheckpointSchema, researchResultSchema, researchToolObservationSchema } from '@/lib/command-centre/idea-research'
import { operateIdeaResearch, readSignedResearchRun, readBoundedResearchJson } from '@/lib/command-centre/idea-research-store'
import { containmentGranted } from '../claim/route'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const base = { taskId: z.string().uuid(), runId: z.string().uuid(), runnerId: z.string().trim().min(1).max(100), platform: z.string().trim().max(32).optional(), containment: z.string().trim().max(32).optional() }
const lease = { ...base, leaseToken: z.string().uuid() }
const schema = z.discriminatedUnion('action', [
  z.object({ ...base, action: z.literal('claim') }).strict(),
  z.object({ ...lease, action: z.literal('heartbeat') }).strict(),
  z.object({ ...lease, action: z.literal('checkpoint'), checkpoint: researchCheckpointSchema }).strict(),
  z.object({ ...lease, action: z.literal('finish'), result: researchResultSchema, toolObservations: z.array(researchToolObservationSchema).max(100).default([]) }).strict(),
  z.object({ ...lease, action: z.literal('block'), reason: z.string().trim().min(1).max(4000), usageReconciled: z.boolean().default(false) }).strict(),
])

function bearerOk(request: Request) {
  const secret = process.env.AGENT_EVENTS_SECRET?.trim()
  if (!secret) return false
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function POST(request: Request) {
  if (!bearerOk(request)) return NextResponse.json({ error: 'Unauthorised', continue: false }, { status: 401, headers })
  const founderId = z.string().uuid().safeParse(process.env.FOUNDER_USER_ID?.trim())
  if (!founderId.success) return NextResponse.json({ error: 'The runner founder connection is unavailable.', continue: false }, { status: 503, headers })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return NextResponse.json({ error: 'Use application/json.', continue: false }, { status: 400, headers })
  let raw: unknown
  try { raw = await readBoundedResearchJson(request) } catch { return NextResponse.json({ error: 'Provide valid JSON within the 1 MiB request limit.', continue: false }, { status: 400, headers }) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Provide a valid research runner command.', continue: false }, { status: 400, headers })
  if (process.env.MISSION_LANE_HARD_STOP === '1' || !containmentGranted({ runnerId: parsed.data.runnerId, platform: parsed.data.platform, containment: parsed.data.containment })) {
    return NextResponse.json({ error: 'This runner is stopped or has no existing registered contained-host grant.', continue: false }, { status: 403, headers })
  }
  try {
    const result = await operateIdeaResearch(founderId.data, parsed.data, { client: createServiceClient() as unknown as DeliveryStoreClient })
    const research = readSignedResearchRun(result.task)
    const lifecycle = readIdeaLifecycle(result.task.metadata)!
    return NextResponse.json({ taskId: result.task.id, research, continue: result.continue, source: 'supabase',
      ...(parsed.data.action === 'claim' ? {
        input: { title: lifecycle.title, rawIdea: lifecycle.rawIdea, mandate: lifecycle.mandate, sources: lifecycle.sources, claims: lifecycle.claims, openDecisions: lifecycle.openDecisions },
        resultSchema: z.toJSONSchema(researchResultSchema, { target: 'draft-7' }),
      } : {}),
    }, { headers })
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof DeliveryNotFound ? 404 : error instanceof DeliveryConflict || error instanceof ResearchConflict ? 409 : 503
    return NextResponse.json({ error: status === 409 && error instanceof Error ? error.message : 'The research command could not be saved or confirmed.', continue: false }, { status, headers })
  }
}
