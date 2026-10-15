import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { appendTaskEventOnce, type CommandCentreTask } from './tasks'
import { getIdeaLifecycleTask } from './idea-lifecycle-store'
import { DeliveryConflict, hashDeliveryInput, type DeliveryMutationClient, type DeliveryStoreClient } from './delivery-store'
import { readIdeaLifecycle } from './idea-lifecycle'
import { MISSION_PROVENANCE_SECRET_ENV } from './voice-mission-bridge'
import {
  readResearchRun, researchRunSchema, researchAuthorityHolds, createResearchRun,
  claimResearchRun, heartbeatResearchRun, checkpointResearchRun, completeResearchRun,
  blockResearchRun, cancelResearchRun, recoverResearchRun, ResearchConflict,
  researchRequestMatches,
  type ResearchRun, type ResearchStart, type ResearchCheckpoint, type ResearchResult, type ResearchToolObservation,
} from './idea-research'

interface WorkerReceipt { runnerId: string; leaseTokenHash: string; resultHash: string; observationsHash: string }
interface ResearchControl { signature: string; workerReceipt?: WorkerReceipt }
export interface ResearchStoreOptions { client?: DeliveryStoreClient; now?: () => string; newId?: () => string }
const now = (options: ResearchStoreOptions) => options.now?.() ?? new Date().toISOString()

export async function readBoundedResearchJson(request: Request): Promise<unknown> {
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
      if (size > 1024 * 1024) { await reader.cancel(); throw new Error('Body exceeds limit') }
      body += decoder.decode(chunk.value, { stream: true })
    }
    return JSON.parse(body + decoder.decode()) as unknown
  } finally { reader.releaseLock() }
}

export function researchSigningAvailable(): boolean { return !!process.env[MISSION_PROVENANCE_SECRET_ENV]?.trim() }

function signature(task: CommandCentreTask, run: ResearchRun, receipt?: WorkerReceipt): string | null {
  const key = process.env[MISSION_PROVENANCE_SECRET_ENV]?.trim()
  return key ? createHmac('sha256', key).update('unite-group:public-research:v1:')
    .update(hashDeliveryInput({ taskId: task.id, founderId: task.founder_id, externalRef: task.external_ref, run, receipt: receipt ?? null })).digest('hex') : null
}

export function readSignedResearchRun(task: CommandCentreTask): ResearchRun | null {
  const run = readResearchRun(task.metadata)
  if (!run) {
    if (task.metadata.research !== undefined) throw new ResearchConflict('The saved research run is invalid. Reload before continuing.')
    return null
  }
  const control = task.metadata.researchControl as ResearchControl | undefined
  const expected = signature(task, run, control?.workerReceipt)
  if (!expected || typeof control?.signature !== 'string' || !/^[a-f0-9]{64}$/.test(control.signature)
    || !timingSafeEqual(Buffer.from(expected), Buffer.from(control.signature))) throw new ResearchConflict('Research permission could not be authenticated.')
  return run
}

async function persist(task: CommandCentreTask, run: ResearchRun, options: ResearchStoreOptions, workerReceipt?: WorkerReceipt): Promise<CommandCentreTask> {
  const checked = researchRunSchema.parse(run)
  const signed = signature(task, checked, workerReceipt)
  if (!signed) throw new Error('Research permission signing is unavailable.')
  const client = options.client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const metadata = { ...task.metadata, research: checked, researchControl: { signature: signed, ...(workerReceipt ? { workerReceipt } : {}) } }
  const updatedAt = new Date(Math.max(Date.parse(now(options)), Date.parse(task.updated_at) + 1)).toISOString()
  const { data, error } = await (client as DeliveryMutationClient).from('cc_tasks').update({ metadata, updated_at: updatedAt })
    .eq('founder_id', task.founder_id).eq('id', task.id).eq('status', task.status).eq('updated_at', task.updated_at).select('*')
  if (error) throw new Error('Research persistence is unavailable.')
  if (!Array.isArray(data) || data.length !== 1) throw new DeliveryConflict()
  const confirmed = await getIdeaLifecycleTask(task.founder_id, task.id, client)
  if (confirmed.updated_at !== (data[0] as CommandCentreTask).updated_at || confirmed.status !== task.status ||
    hashDeliveryInput(confirmed.metadata) !== hashDeliveryInput(metadata)) throw new DeliveryConflict('The saved research run could not be confirmed.')
  return confirmed
}

export async function readIdeaResearch(founderId: string, taskId: string, options: ResearchStoreOptions = {}) {
  const task = await getIdeaLifecycleTask(founderId, taskId, options.client)
  const research = readSignedResearchRun(task)
  const lifecycle = readIdeaLifecycle(task.metadata)!
  return { task, research, authorityCurrent: !!research && researchAuthorityHolds(lifecycle, research, { taskId, founderId, now: now(options) }) }
}

export async function startIdeaResearch(founderId: string, input: ResearchStart, options: ResearchStoreOptions = {}) {
  const { task, research } = await readIdeaResearch(founderId, input.taskId, options)
  const lifecycle = readIdeaLifecycle(task.metadata)!
  if (task.status !== 'proposed' || lifecycle.revision !== input.expectedRevision) throw new ResearchConflict('Start research from the current proposed idea and mandate.')
  if (research?.requestId === input.requestId) {
    if (!researchRequestMatches(research, input)) throw new ResearchConflict('This request ID belongs to different research permission.')
    return { task, deduplicated: true }
  }
  if (research && ['queued', 'running'].includes(research.state)) throw new ResearchConflict('Cancel the existing research run before starting another.')
  if (!researchSigningAvailable()) throw new Error('Research permission signing is unavailable.')
  const created = createResearchRun(lifecycle, input, { taskId: task.id, founderId, actorId: founderId, runId: options.newId?.() ?? randomUUID(), now: now(options) })
  if (research) {
    // Preserve the previous identity even for a row created before reservation receipts existed.
    await reserveRequest(task, research, options)
    await appendTaskEventOnce({ founderId, taskId: task.id, type: 'evidence_added', actor: 'system',
      eventKey: `research-run-snapshot:${research.id}:${hashDeliveryInput(research)}`, payload: { kind: 'untrusted_research_run_snapshot', research } }, options.client)
  }
  if (!await reserveRequest(task, created, options)) throw new ResearchConflict('This research request ID was previously used or reserved. Reload and use a new request ID for new permission.')
  return { task: await persist(task, created, options), deduplicated: false }
}

async function reserveRequest(task: CommandCentreTask, run: ResearchRun, options: ResearchStoreOptions): Promise<boolean> {
  const reserved = await appendTaskEventOnce({ founderId: task.founder_id, taskId: task.id, type: 'comment', actor: 'system',
    eventKey: `research-request:${run.requestId}`, payload: { kind: 'research_request_reservation', requestId: run.requestId, runId: run.id,
      requestHash: hashDeliveryInput({ revision: run.authority.lifecycleRevision, domains: run.authority.allowedDomains, limits: run.authority.limits,
        inputHash: run.authority.inputHash, mandateHash: run.authority.mandateHash }) },
  }, options.client)
  return reserved.created
}

export async function changeIdeaResearch(founderId: string, input: { action: 'cancel' | 'retry'; taskId: string; expectedRevision: number; runId: string }, options: ResearchStoreOptions = {}) {
  const { task, research } = await readIdeaResearch(founderId, input.taskId, options)
  const lifecycle = readIdeaLifecycle(task.metadata)!
  if (!research || research.id !== input.runId || lifecycle.revision !== input.expectedRevision) throw new ResearchConflict('This research run changed. Reload before continuing.')
  const context = { taskId: task.id, founderId, actorId: founderId, now: now(options) }
  const changed = input.action === 'cancel' ? cancelResearchRun(lifecycle, research, context) : recoverResearchRun(lifecycle, research, context)
  return hashDeliveryInput(changed) === hashDeliveryInput(research) ? task : persist(task, changed, options)
}

export type ResearchWorkerCommand = { action: 'claim' | 'heartbeat' | 'checkpoint' | 'finish' | 'block'; taskId: string; runId: string; runnerId: string;
  leaseToken?: string; checkpoint?: ResearchCheckpoint; result?: ResearchResult; toolObservations?: ResearchToolObservation[]; reason?: string; usageReconciled?: boolean }

export async function operateIdeaResearch(founderId: string, input: ResearchWorkerCommand, options: ResearchStoreOptions = {}) {
  const { task, research } = await readIdeaResearch(founderId, input.taskId, options)
  const lifecycle = readIdeaLifecycle(task.metadata)!
  if (!research || research.id !== input.runId) throw new ResearchConflict('This research run is unavailable or superseded.')
  const stamp = now(options)
  if (input.action !== 'claim' && research.state === 'completed' && input.action === 'finish') {
    const receipt = (task.metadata.researchControl as ResearchControl).workerReceipt
    if (researchAuthorityHolds(lifecycle, research, { taskId: task.id, founderId, now: stamp }) && receipt && receipt.runnerId === input.runnerId && receipt.leaseTokenHash === hashDeliveryInput(input.leaseToken)
      && receipt.resultHash === hashDeliveryInput(input.result) && receipt.observationsHash === hashDeliveryInput(input.toolObservations ?? [])) return { task, continue: false }
    throw new ResearchConflict('The finished research result cannot be changed or replayed by another lease.')
  }
  if (input.action !== 'claim' && (research.lease?.runnerId !== input.runnerId || research.lease.token !== input.leaseToken)) throw new ResearchConflict('The research lease changed or was cancelled.')
  if (input.action === 'block') {
    const stopped = blockResearchRun(lifecycle, research, { code: 'worker_interruption', message: input.reason! }, { taskId: task.id, founderId, runnerId: input.runnerId, leaseToken: input.leaseToken!, now: stamp }, input.usageReconciled ?? false)
    return { task: await persist(task, stopped, options), continue: false }
  }
  const leaseExpired = input.action !== 'claim' && !!research.lease && Date.parse(research.lease.expiresAt) <= Date.parse(stamp)
  const deadlineExpired = !!research.deadlineAt && Date.parse(research.deadlineAt) <= Date.parse(stamp)
  if (!researchAuthorityHolds(lifecycle, research, { taskId: task.id, founderId, now: stamp }) || task.status !== 'proposed') {
    const cancelled = cancelResearchRun(lifecycle, research, { taskId: task.id, founderId, actorId: founderId, now: stamp })
    await persist(task, cancelled, options)
    throw new ResearchConflict('Research permission expired or changed. Stop the worker and review a fresh mandate.')
  }
  if (leaseExpired || deadlineExpired) {
    const closed = research.lease ? blockResearchRun(lifecycle, research,
      { code: leaseExpired ? 'lease_expired' : 'time_allowance_exhausted', message: 'The worker stopped after its lease or fixed time allowance expired.' },
      { taskId: task.id, founderId, runnerId: research.lease.runnerId, leaseToken: research.lease.token, now: stamp })
      : cancelResearchRun(lifecycle, research, { taskId: task.id, founderId, actorId: founderId, now: stamp })
    await persist(task, closed, options)
    throw new ResearchConflict('The research lease or fixed time allowance expired. Stop this worker.')
  }
  const context = { taskId: task.id, founderId, runnerId: input.runnerId,
    leaseToken: input.action === 'claim' ? options.newId?.() ?? randomUUID() : input.leaseToken!, now: stamp }
  let updated: ResearchRun
  let receipt: WorkerReceipt | undefined
  switch (input.action) {
    case 'claim': updated = claimResearchRun(lifecycle, research, context); break
    case 'heartbeat': updated = heartbeatResearchRun(lifecycle, research, context); break
    case 'checkpoint': updated = checkpointResearchRun(lifecycle, research, input.checkpoint!, context); break
    case 'finish':
      updated = completeResearchRun(lifecycle, research, input.result!, context, input.toolObservations ?? [])
      receipt = { runnerId: input.runnerId, leaseTokenHash: hashDeliveryInput(input.leaseToken), resultHash: hashDeliveryInput(input.result), observationsHash: hashDeliveryInput(input.toolObservations ?? []) }
  }
  const saved = hashDeliveryInput(updated) === hashDeliveryInput(research) ? task : await persist(task, updated, options, receipt)
  return { task: saved, continue: updated.state === 'running' }
}
