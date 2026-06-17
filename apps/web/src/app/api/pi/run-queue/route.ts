import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  assignMachineForTask,
  buildContinuationEnforcement,
  buildTaskPacketFromIdea,
  createRunQueueStore,
  type FounderDevice,
} from '../../../../lib/founder-os'
import {
  listFounderRunQueueItems,
  saveFounderRunQueueItem,
} from '@/lib/founder-os/run-queue-persistence'

export const dynamic = 'force-dynamic'

interface PiRunQueueRequestBody {
  message?: string
  now?: string
  idSeed?: string
}

const DEFAULT_FOUNDER_DEVICES: FounderDevice[] = [
  {
    id: 'mac-mini',
    displayName: 'Mac mini',
    role: 'always_on_host',
    status: 'online',
    maxRiskLevel: 'high',
    currentLoad: 3,
    capabilities: ['cron', 'webhooks', 'queue_worker', 'context_sync', 'scheduled_briefs'],
  },
  {
    id: 'windows-desktop',
    displayName: 'Windows Desktop PC',
    role: 'heavy_worker',
    status: 'online',
    maxRiskLevel: 'high',
    currentLoad: 2,
    capabilities: ['heavy_builds', 'docker', 'local_verification', 'browser_automation', 'playwright', 'queue_worker', 'context_sync'],
  },
  {
    id: 'macbook-pro',
    displayName: 'MacBook Pro',
    role: 'mobile_cockpit',
    status: 'idle',
    maxRiskLevel: 'human_only',
    currentLoad: 0,
    capabilities: ['idea_capture', 'approval_review', 'voice_input', 'mobile_review'],
  },
]

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Durable, founder-scoped: rehydrate from pi_run_queue (survives cold starts).
  const store = createRunQueueStore(await listFounderRunQueueItems(user.id))
  const items = store.list()

  return NextResponse.json({
    items,
    summary: store.summary(),
    enforcement: buildContinuationEnforcement(items),
  })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: PiRunQueueRequestBody

  try {
    body = (await request.json()) as PiRunQueueRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  if (message.length > 4000) {
    return NextResponse.json({ error: 'message exceeds 4,000 character limit' }, { status: 400 })
  }

  const routeResult = buildTaskPacketFromIdea({
    message,
    now: body.now,
    idSeed: body.idSeed,
  })
  const machineAssignment = assignMachineForTask(routeResult.taskPacket, DEFAULT_FOUNDER_DEVICES)

  // Load → enqueue (pure logic) → persist the new item, all founder-scoped.
  const store = createRunQueueStore(await listFounderRunQueueItems(user.id))
  const queueItem = store.enqueue({
    taskPacket: routeResult.taskPacket,
    contextPack: routeResult.contextPack,
    machineAssignment,
    now: body.now,
  })
  await saveFounderRunQueueItem(user.id, queueItem)

  return NextResponse.json({
    queueItem,
    routingReasons: routeResult.routingReasons,
    enforcement: buildContinuationEnforcement(store.list()),
    receipt: {
      id: `receipt_${queueItem.id}`,
      status: 'queued',
      generatedAt: queueItem.updatedAt,
      source: '/api/pi/run-queue',
      requiresHumanApproval: routeResult.taskPacket.requiresHumanApproval ?? false,
      nextRecommendedAction: routeResult.contextPack.nextRecommendedAction,
    },
  })
}
