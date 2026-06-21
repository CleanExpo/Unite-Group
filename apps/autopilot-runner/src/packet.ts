// apps/autopilot-runner/src/packet.ts
//
// Packet ingestion: pull the next LinearExecutionPacket from the DEPLOYED
// read-only handoff endpoint (apps/web GET /api/cron/linear-handoff) and validate
// it. The runner consumes the existing read-side wholesale — no parallel queue,
// no Linear client of its own (spec §2).
//
// The handoff response envelope (verified against the route) is:
//   { ok: true, source, ...ClaimLoopResult, next_action: 'claim_and_build' | 'idle' }
// where `execution_packet` is `LinearExecutionPacket | null`. 401 on bad CRON_SECRET.
//
// All HTTP is dependency-injected (fetchFn) so this is unit-tested without
// network or secrets. Validation is fail-closed: any malformed field → error,
// never a half-trusted packet handed to an executor.

export interface LinearExecutionStep {
  id: string
  title: string
  command: string
}

export interface LinearExecutionPacket {
  source: 'command-centre:linear-claim'
  runId: string
  runner: string
  issue: {
    id: string
    identifier: string
    title: string
    url?: string
    priority: number
  }
  branchName: string
  prompt: string
  steps: LinearExecutionStep[]
}

export type FetchPacketResult =
  | { status: 'packet'; packet: LinearExecutionPacket }
  | { status: 'idle' }
  | { status: 'error'; error: string }

// ── Validation (fail-closed) ─────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
function isString(v: unknown): v is string {
  return typeof v === 'string'
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function parseStep(v: unknown): LinearExecutionStep | null {
  if (!isObject(v)) return null
  if (!isString(v.id) || !isString(v.title) || !isString(v.command)) return null
  return { id: v.id, title: v.title, command: v.command }
}

/** Validate an execution packet. Returns null on any structural mismatch. */
export function parsePacket(v: unknown): LinearExecutionPacket | null {
  if (!isObject(v)) return null
  if (v.source !== 'command-centre:linear-claim') return null
  if (!isString(v.runId) || !isString(v.runner) || !isString(v.branchName) || !isString(v.prompt)) {
    return null
  }

  const issue = v.issue
  if (!isObject(issue)) return null
  if (!isString(issue.id) || !isString(issue.identifier) || !isString(issue.title)) return null
  if (!isFiniteNumber(issue.priority)) return null
  if (issue.url !== undefined && !isString(issue.url)) return null

  if (!Array.isArray(v.steps)) return null
  const steps: LinearExecutionStep[] = []
  for (const raw of v.steps) {
    const step = parseStep(raw)
    if (!step) return null
    steps.push(step)
  }

  const out: LinearExecutionPacket = {
    source: 'command-centre:linear-claim',
    runId: v.runId,
    runner: v.runner,
    issue: {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority,
    },
    branchName: v.branchName,
    prompt: v.prompt,
    steps,
  }
  if (isString(issue.url)) out.issue.url = issue.url
  return out
}

/** Validate the handoff envelope and resolve to packet / idle / error. */
export function parseHandoffResponse(v: unknown): FetchPacketResult {
  if (!isObject(v)) return { status: 'error', error: 'malformed handoff response: not an object' }
  if (v.ok !== true) {
    return { status: 'error', error: isString(v.error) ? v.error : 'handoff returned ok=false' }
  }
  if (v.execution_packet === null || v.execution_packet === undefined) {
    return { status: 'idle' }
  }
  const packet = parsePacket(v.execution_packet)
  if (!packet) return { status: 'error', error: 'malformed execution_packet' }
  return { status: 'packet', packet }
}

// ── Fetch (dependency-injected) ──────────────────────────────────────────────

export interface FetchPacketDeps {
  /** Full URL of the deployed GET /api/cron/linear-handoff. */
  endpoint: string
  /** CRON_SECRET — the bearer the handoff route checks. */
  cronSecret: string
  /** Injected fetch implementation (real `fetch` in prod, fake in tests). */
  fetchFn: typeof fetch
}

/** GET the handoff endpoint, authed by CRON_SECRET, and resolve a typed result. */
export async function fetchPacket(deps: FetchPacketDeps): Promise<FetchPacketResult> {
  let res: Response
  try {
    res = await deps.fetchFn(deps.endpoint, {
      method: 'GET',
      signal: AbortSignal.timeout(20000),
      headers: { authorization: `Bearer ${deps.cronSecret}` },
    })
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? `fetch failed: ${err.message}` : 'fetch failed' }
  }

  if (res.status === 401) return { status: 'error', error: 'unauthorised — check CRON_SECRET' }
  if (!res.ok) return { status: 'error', error: `handoff HTTP ${res.status}` }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    return { status: 'error', error: 'handoff returned non-JSON' }
  }
  return parseHandoffResponse(body)
}
