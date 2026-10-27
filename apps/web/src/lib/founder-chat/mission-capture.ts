// src/lib/founder-chat/mission-capture.ts
// Mission Control chat W1a — records at most one captured delivery mission per
// founder chat turn, keyed by the client turnId, and returns a truthful receipt.
//
// Boundaries:
//   - runs only after every early return in the route (auth, allow-list, parse,
//     AI client, grounding), so no row is written on a request that cannot
//     deliver the receipt frame;
//   - writes through the session (RLS) client with founder_id = the session user;
//   - the founder's words never set status, approval or events: the row is
//     always born 'proposed' with humanApprovalRequired true;
//   - the registry read and the whole store sequence are bounded by one deadline;
//     a registry timeout is "registry unavailable"; a store timeout or network
//     failure is "not confirmed", a Postgres error is "not recorded";
//   - "recorded" only when both the row and its created event came back.

import { captureApiError } from '@/lib/error-reporting'
import {
  appendTaskEventOnce,
  createTaskOnce,
  TaskStoreError,
  type AppendTaskEventOnceResult,
  type CommandCentreTask,
  type SupabaseLike,
} from '@/lib/command-centre/tasks'
import { buildCapturedDelivery } from '@/lib/command-centre/delivery-envelope'
import { readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { hashDeliveryInput } from '@/lib/command-centre/delivery-store'
import { matchDeliveryProject, resolveDeliveryProjects } from '@/lib/command-centre/delivery-projects'
import { getProjects, type CommandCentreProject } from '@/lib/command-centre/registry'
import { classifyMissionIntent, type MissionIntentKind } from './mission-intent'
import { readbackReceipt, receiptFrom, type MissionReceipt } from './mission-receipt'

export const CAPTURE_DEADLINE_MS = 5000
export const CHAT_EXTERNAL_REF_PREFIX = 'delivery:chat:'
const ROUTE = '/api/founder/chat'

export type CaptureStage =
  | 'classify'
  | 'resolve_project'
  | 'create_client'
  | 'create_task'
  | 'append_event'
  | 'readback'

export interface CaptureMissionInput {
  founderId: string
  /** UUID-validated by the request parser; absent → nothing is captured. */
  turnId: string | null
  /** The founder's latest message, exactly as sent. */
  text: string
  /**
   * The session (RLS) client, or a factory for it. A factory is called only on
   * the build path, so a question or unsupported turn never opens a client.
   */
  client: SupabaseLike | (() => Promise<SupabaseLike>)
}

export interface CaptureMissionOptions {
  /** Defaults to AbortSignal.timeout(CAPTURE_DEADLINE_MS); bounds the registry read and every store call. */
  signal?: AbortSignal
  /** Defaults to the portfolio registry. */
  loadProjects?: () => Promise<CommandCentreProject[]>
}

export interface CaptureMissionResult {
  kind: MissionIntentKind
  /** null when no receipt frame is owed (no turnId, or an ordinary question). */
  receipt: MissionReceipt | null
}

class CaptureDeadlineError extends Error {
  constructor() {
    super('mission capture deadline exceeded')
    this.name = 'CaptureDeadlineError'
  }
}

function withDeadline<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new CaptureDeadlineError())
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new CaptureDeadlineError())
    signal.addEventListener('abort', onAbort, { once: true })
    work.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

/** A Postgres-coded store error is a definite refusal; anything else is unknown. */
function storeFailureReceipt(err: unknown): MissionReceipt {
  return err instanceof TaskStoreError && err.code ? { kind: 'failed_to_record' } : { kind: 'not_confirmed' }
}

export async function captureMission(
  input: CaptureMissionInput,
  options: CaptureMissionOptions = {},
): Promise<CaptureMissionResult> {
  const { founderId, turnId, text } = input
  // One deadline for the whole capture, created before any awaited work.
  const signal = options.signal ?? AbortSignal.timeout(CAPTURE_DEADLINE_MS)
  const externalRef = turnId ? `${CHAT_EXTERNAL_REF_PREFIX}${turnId}` : null
  let projectKey: string | null = null
  let task: CommandCentreTask | null = null
  let created = false

  const report = (err: unknown, stage: CaptureStage) =>
    captureApiError(err, { route: ROUTE, founderId, turnId, externalRef, projectKey, stage })

  const finish = (kind: MissionIntentKind, receipt: MissionReceipt | null): CaptureMissionResult => {
    console.info('[founder-chat] mission capture', {
      turnId,
      kind,
      receipt: receipt?.kind ?? null,
      projectResolved: projectKey !== null,
      taskId: task?.id ?? null,
      created,
    })
    return { kind, receipt }
  }

  let kind: MissionIntentKind
  try {
    kind = classifyMissionIntent(text)
  } catch (err) {
    report(err, 'classify')
    kind = 'question'
  }

  if (!turnId || !externalRef) {
    if (kind === 'build_request') {
      console.warn('[founder-chat] build request without a turnId; nothing was recorded', { founderId })
    }
    return finish(kind, null)
  }
  if (kind === 'question') return finish(kind, null)
  if (kind === 'unsupported_action') return finish(kind, { kind: 'unsupported_action' })

  // build_request — resolve the project only now, never for a question.
  let projects: CommandCentreProject[]
  try {
    const resolved = resolveDeliveryProjects(await withDeadline((options.loadProjects ?? getProjects)(), signal))
    if (resolved.error) throw new Error(resolved.error)
    projects = resolved.projects
  } catch (err) {
    report(err, 'resolve_project')
    return finish(kind, { kind: 'registry_unavailable' })
  }
  const project = matchDeliveryProject(text, projects)
  if (!project) return finish(kind, { kind: 'needs_project' })
  projectKey = project.name

  // The database client is opened only now, for a build request with a project.
  let client: SupabaseLike
  try {
    client = typeof input.client === 'function' ? await withDeadline(input.client(), signal) : input.client
  } catch (err) {
    report(err, 'create_client')
    // No client means no write was possible: a definite "not recorded".
    return finish(kind, { kind: 'failed_to_record' })
  }

  const inputHash = hashDeliveryInput({ source: 'founder_chat', idea: text, projectKey })

  try {
    const result = await withDeadline(
      createTaskOnce(
        {
          founderId,
          externalRef,
          status: 'proposed',
          origin: 'idea',
          executionMode: 'branch-preview',
          humanApprovalRequired: true,
          title: text.slice(0, 100),
          objective: text,
          projectKey,
          metadata: {
            delivery: buildCapturedDelivery({ inputHash, projectKey, originalIdea: text }),
            source: 'founder_chat',
            turnId,
          },
        },
        client,
      ),
      signal,
    )
    task = result.task
    created = result.created
  } catch (err) {
    report(err, 'create_task')
    return finish(kind, storeFailureReceipt(err))
  }

  // A replayed turnId must carry the same request; otherwise refuse it.
  if (task.founder_id !== founderId || readDeliveryMetadata(task)?.inputHash !== inputHash) {
    report(new Error('turnId reused for a different request'), 'create_task')
    return finish(kind, { kind: 'conflict' })
  }

  // Always append: a retry after a failed append writes the missing audit row,
  // and the deterministic event id keeps it to exactly one.
  let event: AppendTaskEventOnceResult | null = null
  try {
    event = await withDeadline(appendCreatedEvent(task, turnId, client), signal)
  } catch (err) {
    report(err, 'append_event')
  }

  return finish(kind, receiptFrom(task, event))
}

function appendCreatedEvent(
  task: CommandCentreTask,
  turnId: string,
  client: SupabaseLike,
): Promise<AppendTaskEventOnceResult> {
  return appendTaskEventOnce(
    {
      founderId: task.founder_id,
      taskId: task.id,
      type: 'created',
      actor: 'founder_chat',
      eventKey: 'created',
      payload: { source: 'founder_chat', turnId, externalRef: task.external_ref },
    },
    client,
  )
}

// ─── GET readback ──────────────────────────────────────────────────────────────

const READBACK_COLUMNS = 'id, external_ref, status, title, project_key, human_approval_required'

/** The one batched, founder-scoped cc_tasks read the GET readback makes. */
export interface ReceiptReadClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        in(column: string, values: string[]): PromiseLike<{
          data: unknown
          error: { message: string; code?: string } | null
        }>
      }
    }
  }
}

type ReadbackRow = Parameters<typeof readbackReceipt>[0]

export interface PersistedTurn {
  turnId: string
  /** The persisted user message text, re-classified to decide if a receipt is owed. */
  text: string
}

/**
 * Resolve each persisted user turn's receipt from the cc_tasks row read NOW for
 * (founder, delivery:chat:<turnId>) in ONE query covering EVERY persisted turnId.
 * The stored text is client-editable (PUT), so it never hides a row: a found row
 * is always its mission receipt. Only when no row exists does the text decide:
 * a question or unsupported action never owed a draft → null (no receipt); a
 * build request → not_found. Query failure → unavailable for every turn (fails
 * closed, never a stored value).
 */
export async function readMissionReceipts(
  client: ReceiptReadClient,
  founderId: string,
  turns: readonly PersistedTurn[],
): Promise<Record<string, MissionReceipt | null>> {
  const receipts: Record<string, MissionReceipt | null> = {}
  // turnId → whether a missing row means a lost draft (any copy reads as a build).
  const owedIfMissing = new Map<string, boolean>()
  for (const { turnId, text } of turns) {
    const owed = classifyMissionIntent(text) === 'build_request'
    owedIfMissing.set(turnId, (owedIfMissing.get(turnId) ?? false) || owed)
  }
  const unique = [...owedIfMissing.keys()]
  if (unique.length === 0) return receipts
  const refs = unique.map((turnId) => `${CHAT_EXTERNAL_REF_PREFIX}${turnId}`)
  let rows: ReadbackRow[]
  try {
    const { data, error } = await client
      .from('cc_tasks')
      .select(READBACK_COLUMNS)
      .eq('founder_id', founderId)
      .in('external_ref', refs)
    if (error) throw new Error(`mission readback failed: ${error.message}`)
    rows = Array.isArray(data) ? (data as ReadbackRow[]) : []
  } catch (err) {
    captureApiError(err, { route: ROUTE, founderId, turnIds: unique, stage: 'readback' satisfies CaptureStage })
    for (const turnId of unique) receipts[turnId] = { kind: 'unavailable' }
    return receipts
  }
  const byRef = new Map(rows.map((row) => [row.external_ref, row]))
  for (const turnId of unique) {
    const row = byRef.get(`${CHAT_EXTERNAL_REF_PREFIX}${turnId}`)
    if (row) receipts[turnId] = readbackReceipt(row)
    else receipts[turnId] = owedIfMissing.get(turnId) ? { kind: 'not_found' } : null
  }
  return receipts
}
