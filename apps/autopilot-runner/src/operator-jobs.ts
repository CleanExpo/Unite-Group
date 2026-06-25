// apps/autopilot-runner/src/operator-jobs.ts
//
// Step 2b — the agent claims operator_jobs from prod Supabase, runs a SAFE,
// gated execution, and streams operator_events back. This is the work-dispatch
// half of the live command-centre bridge (presence/heartbeat was Step 2).
//
// Safety posture (mirrors apps/web/src/lib/operator-gateway: gates reused, not
// bypassed):
//   - Kill switch: nothing runs unless CC_OPERATOR_JOBS_LIVE === '1' (default OFF).
//   - Founder-scoped: every query filters founder_id (single tenant).
//   - Lifecycle: only canTransition()-legal status moves; queued→running→{done,blocked}.
//   - Hard-gated task types and any external/production/api-key flag → job is
//     BLOCKED with a gate_blocked event. Never executed.
//   - Tier 1 execution is read-only INTROSPECTION only — no user-supplied
//     commands, no `claude -p`, no shell injection surface. Code/agentic
//     execution (Tier 2) is intentionally NOT wired here.
//
// Writes use the service-role key + FOUNDER_USER_ID (same identity as the
// heartbeat + the CRM crons). Service role bypasses RLS; founder_id is still set
// explicitly. Every side effect is dependency-injected for unit testing.

import * as os from 'node:os'

// Mirror of apps/web/src/lib/operator-gateway/lanes.ts HARD_GATED_TASK_TYPES.
export const HARD_GATED_TASK_TYPES = [
  'production_deploy',
  'production_db_write',
  'payments',
  'email_send',
  'claims_orders',
  'secrets_access',
] as const

// Tier 1: task types the agent will actually execute — read-only introspection only.
export const SAFE_EXECUTABLE_TASK_TYPES = ['diagnostic', 'evidence_audit', 'verification'] as const

export type OperatorJobStatus =
  | 'planned'
  | 'queued'
  | 'running'
  | 'blocked'
  | 'done'
  | 'failed'
  | 'cancelled'

// Mirror of apps/web ALLOWED_TRANSITIONS — keep the agent honest about lifecycle.
const ALLOWED_TRANSITIONS: Record<OperatorJobStatus, OperatorJobStatus[]> = {
  planned: ['queued', 'running', 'cancelled'],
  queued: ['running', 'cancelled'],
  running: ['blocked', 'done', 'failed', 'cancelled'],
  blocked: ['running', 'failed', 'cancelled'],
  done: [],
  failed: [],
  cancelled: [],
}

export function canTransition(from: OperatorJobStatus, to: OperatorJobStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export interface OperatorJob {
  id: string
  founder_id: string
  lane_id: string
  title: string
  task_type: string
  status: OperatorJobStatus
  external_action_requested: boolean
  production_action_requested: boolean
  api_key_requested: boolean
}

export interface OperatorJobsConfig {
  supabaseUrl: string
  serviceRoleKey: string
  founderId: string
  agentId: string
  /** Kill switch — CC_OPERATOR_JOBS_LIVE === '1'. Default false drains immediately. */
  live: boolean
}

export type LoadOperatorJobsConfigResult =
  | { ok: true; config: OperatorJobsConfig }
  | { ok: false; error: string }

export function loadOperatorJobsConfig(env: NodeJS.ProcessEnv = process.env): LoadOperatorJobsConfigResult {
  const supabaseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  const founderId = (env.FOUNDER_USER_ID ?? '').trim()

  const missing: string[] = []
  if (!supabaseUrl) missing.push('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!founderId) missing.push('FOUNDER_USER_ID')
  if (missing.length > 0) return { ok: false, error: `missing required env: ${missing.join(', ')}` }

  return {
    ok: true,
    config: {
      supabaseUrl,
      serviceRoleKey,
      founderId,
      agentId: (env.HERMES_AGENT_ID ?? os.hostname()).trim() || os.hostname(),
      live: env.CC_OPERATOR_JOBS_LIVE === '1',
    },
  }
}

export interface OperatorJobsDeps {
  fetch: typeof fetch
  now: () => number
  log?: (msg: string) => void
  /** Tier 1 introspection — injectable for tests. Default reads real machine facts. */
  machineFacts?: () => string
}

function defaultMachineFacts(): string {
  return [
    `node ${process.version}`,
    `${process.platform}/${process.arch}`,
    `host ${os.hostname()}`,
    `uptime ${Math.round(process.uptime())}s`,
  ].join(' · ')
}

function headers(config: OperatorJobsConfig): Record<string, string> {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

async function appendEvent(
  config: OperatorJobsConfig,
  deps: OperatorJobsDeps,
  event: {
    jobId: string
    eventType: 'status_changed' | 'evidence_added' | 'gate_blocked' | 'note'
    fromStatus?: OperatorJobStatus
    toStatus?: OperatorJobStatus
    detail: string
    evidenceRef?: string
  },
): Promise<void> {
  const url = `${config.supabaseUrl}/rest/v1/operator_events`
  await deps.fetch(url, {
    method: 'POST',
    headers: { ...headers(config), Prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        founder_id: config.founderId,
        job_id: event.jobId,
        event_type: event.eventType,
        from_status: event.fromStatus ?? null,
        to_status: event.toStatus ?? null,
        detail: event.detail,
        evidence_ref: event.evidenceRef ?? null,
      },
    ]),
  })
}

/**
 * Atomically claim the next pending job: SELECT one planned/queued job, then a
 * conditional PATCH to 'running'. If the PATCH matches 0 rows another worker won
 * the race — we return null and try again next tick. Returns the claimed job
 * (now status='running') or null when there is nothing to do.
 */
export async function claimNextJob(
  config: OperatorJobsConfig,
  deps: OperatorJobsDeps,
): Promise<OperatorJob | null> {
  const cols =
    'id,founder_id,lane_id,title,task_type,status,external_action_requested,production_action_requested,api_key_requested'
  const selectUrl =
    `${config.supabaseUrl}/rest/v1/operator_jobs` +
    `?founder_id=eq.${config.founderId}` +
    `&status=in.(planned,queued)` +
    `&select=${cols}&order=created_at.asc&limit=1`

  const selectRes = await deps.fetch(selectUrl, { method: 'GET', headers: headers(config) })
  if (!selectRes.ok) throw new Error(`operator_jobs select failed: ${selectRes.status}`)
  const rows = (await selectRes.json()) as OperatorJob[]
  const job = Array.isArray(rows) ? rows[0] : undefined
  if (!job) return null

  // Conditional claim — only succeeds while the row is still planned/queued.
  const claimUrl =
    `${config.supabaseUrl}/rest/v1/operator_jobs` +
    `?id=eq.${job.id}&founder_id=eq.${config.founderId}&status=in.(planned,queued)`
  const claimRes = await deps.fetch(claimUrl, {
    method: 'PATCH',
    headers: { ...headers(config), Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'running', updated_at: new Date(deps.now()).toISOString() }),
  })
  if (!claimRes.ok) throw new Error(`operator_jobs claim failed: ${claimRes.status}`)
  const claimed = (await claimRes.json()) as OperatorJob[]
  if (!Array.isArray(claimed) || claimed.length === 0) return null // lost the race

  await appendEvent(config, deps, {
    jobId: job.id,
    eventType: 'status_changed',
    fromStatus: job.status,
    toStatus: 'running',
    detail: `claimed by agent ${config.agentId}`,
  })

  return { ...job, status: 'running' }
}

export type JobSafety = { ok: true } | { ok: false; reason: string }

/** Reuse the apps/web gates: hard-gated task types and any escalation flag → blocked. */
export function validateJobSafety(job: OperatorJob): JobSafety {
  if ((HARD_GATED_TASK_TYPES as readonly string[]).includes(job.task_type)) {
    return { ok: false, reason: `task_type '${job.task_type}' is hard-gated` }
  }
  if (job.external_action_requested) return { ok: false, reason: 'external_action_requested is set' }
  if (job.production_action_requested) return { ok: false, reason: 'production_action_requested is set' }
  if (job.api_key_requested) return { ok: false, reason: 'api_key_requested is set' }
  return { ok: true }
}

export type JobOutcome =
  | { outcome: 'idle' }
  | { outcome: 'done'; jobId: string; summary: string }
  | { outcome: 'blocked'; jobId: string; reason: string }
  | { outcome: 'drained' } // kill switch off

async function transition(
  config: OperatorJobsConfig,
  deps: OperatorJobsDeps,
  job: OperatorJob,
  to: OperatorJobStatus,
): Promise<void> {
  const url = `${config.supabaseUrl}/rest/v1/operator_jobs?id=eq.${job.id}&founder_id=eq.${config.founderId}`
  await deps.fetch(url, {
    method: 'PATCH',
    headers: { ...headers(config), Prefer: 'return=minimal' },
    body: JSON.stringify({ status: to, updated_at: new Date(deps.now()).toISOString() }),
  })
}

/**
 * One tick: claim a job, gate-check it, and either execute (Tier 1, read-only)
 * or block it. Lifecycle-legal transitions only; every step writes an event.
 */
export async function runOperatorJobsOnce(
  config: OperatorJobsConfig,
  deps: OperatorJobsDeps,
): Promise<JobOutcome> {
  if (!config.live) return { outcome: 'drained' }

  const job = await claimNextJob(config, deps)
  if (!job) return { outcome: 'idle' }

  // Gate check — hard-gated / escalation flags can never execute.
  const safety = validateJobSafety(job)
  if (!safety.ok) {
    await appendEvent(config, deps, {
      jobId: job.id,
      eventType: 'gate_blocked',
      fromStatus: 'running',
      toStatus: 'blocked',
      detail: safety.reason,
    })
    if (canTransition('running', 'blocked')) await transition(config, deps, job, 'blocked')
    return { outcome: 'blocked', jobId: job.id, reason: safety.reason }
  }

  // Tier 1: execute only the read-only allowlist; everything else is plumbing-only
  // (claimed + acknowledged, blocked pending a Tier 2 executor — never falsely "done").
  if (!(SAFE_EXECUTABLE_TASK_TYPES as readonly string[]).includes(job.task_type)) {
    const reason = `no executor for task_type '${job.task_type}' (Tier 2 not enabled)`
    await appendEvent(config, deps, {
      jobId: job.id,
      eventType: 'note',
      fromStatus: 'running',
      toStatus: 'blocked',
      detail: reason,
    })
    if (canTransition('running', 'blocked')) await transition(config, deps, job, 'blocked')
    return { outcome: 'blocked', jobId: job.id, reason }
  }

  const facts = (deps.machineFacts ?? defaultMachineFacts)()
  const summary = `${job.task_type} ok — ${facts}`
  await appendEvent(config, deps, {
    jobId: job.id,
    eventType: 'evidence_added',
    detail: summary,
    evidenceRef: `agent:${config.agentId}`,
  })
  await appendEvent(config, deps, {
    jobId: job.id,
    eventType: 'status_changed',
    fromStatus: 'running',
    toStatus: 'done',
    detail: 'completed by agent (Tier 1 read-only execution)',
  })
  if (canTransition('running', 'done')) await transition(config, deps, job, 'done')
  return { outcome: 'done', jobId: job.id, summary }
}
