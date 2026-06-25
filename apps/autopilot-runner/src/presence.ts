// apps/autopilot-runner/src/presence.ts
//
// Agent-side heartbeat for the Model Operator Gateway bridge.
//
// The runner dials OUT to Supabase and upserts a row into operator_agent_presence
// every ~15s. The live command-centre reads last_seen_at and derives connected
// (<30s) / stale (<5m) / offline. This is the "connection" — no inbound exposure
// of the agent, no second crypto layer; Supabase is the relay.
//
// Writes use the service-role key + FOUNDER_USER_ID (the same auth identity the
// CRM's cron jobs use). The write goes via PostgREST upsert — no Supabase client
// dependency, every side effect dependency-injected so the whole thing is unit-tested.

import * as os from 'node:os'

export interface PresenceConfig {
  supabaseUrl: string
  serviceRoleKey: string
  founderId: string
  agentId: string
  hostname: string
  agentVersion: string
  capabilities: Record<string, unknown>
  /** Captured once at boot — uptime since this process started. Stable across beats. */
  startedAtIso: string
  /** Heartbeat cadence. Default 15s keeps the 30s "connected" window from flapping. */
  intervalMs: number
}

export type LoadPresenceConfigResult =
  | { ok: true; config: PresenceConfig }
  | { ok: false; error: string }

const DEFAULT_INTERVAL_MS = 15_000

/**
 * Build the presence config from env. Fails closed with a clear message when a
 * required value is missing — the daemon refuses to start rather than silently
 * never heart-beating (the classic "agent not connecting" footgun).
 */
export function loadPresenceConfig(
  env: NodeJS.ProcessEnv = process.env,
  nowIso: string = new Date().toISOString(),
): LoadPresenceConfigResult {
  const supabaseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  const founderId = (env.FOUNDER_USER_ID ?? '').trim()

  const missing: string[] = []
  if (!supabaseUrl) missing.push('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!founderId) missing.push('FOUNDER_USER_ID')
  if (missing.length > 0) {
    return { ok: false, error: `missing required env: ${missing.join(', ')}` }
  }

  let capabilities: Record<string, unknown> = { source: 'autopilot-runner' }
  const rawCaps = env.HERMES_AGENT_CAPABILITIES?.trim()
  if (rawCaps) {
    try {
      const parsed = JSON.parse(rawCaps)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        capabilities = parsed as Record<string, unknown>
      }
    } catch {
      // keep the default; a malformed env var must not break the heartbeat
    }
  }

  const intervalMs = Number.parseInt(env.HERMES_HEARTBEAT_INTERVAL_MS ?? '', 10)

  return {
    ok: true,
    config: {
      supabaseUrl,
      serviceRoleKey,
      founderId,
      agentId: (env.HERMES_AGENT_ID ?? os.hostname()).trim() || os.hostname(),
      hostname: os.hostname(),
      agentVersion: (env.HERMES_AGENT_VERSION ?? 'autopilot-runner@0.0.1').trim(),
      capabilities,
      startedAtIso: nowIso,
      intervalMs: Number.isFinite(intervalMs) && intervalMs >= 1000 ? intervalMs : DEFAULT_INTERVAL_MS,
    },
  }
}

export interface PresenceRow {
  founder_id: string
  agent_id: string
  hostname: string
  agent_version: string
  capabilities: Record<string, unknown>
  started_at: string
  last_seen_at: string
}

/** Pure row builder. last_seen_at = the heartbeat moment; started_at = boot time. */
export function buildPresenceRow(config: PresenceConfig, lastSeenIso: string): PresenceRow {
  return {
    founder_id: config.founderId,
    agent_id: config.agentId,
    hostname: config.hostname,
    agent_version: config.agentVersion,
    capabilities: config.capabilities,
    started_at: config.startedAtIso,
    last_seen_at: lastSeenIso,
  }
}

export interface HeartbeatDeps {
  fetch: typeof fetch
  now: () => number
}

export type SendHeartbeatResult = { ok: true } | { ok: false; error: string }

/**
 * Upsert one heartbeat via PostgREST. on_conflict on the (founder_id, agent_id)
 * PK so repeated beats update last_seen_at in place. Never throws — a network
 * failure returns { ok: false } so the loop can log and keep beating.
 */
export async function sendHeartbeat(
  config: PresenceConfig,
  deps: HeartbeatDeps,
): Promise<SendHeartbeatResult> {
  const lastSeenIso = new Date(deps.now()).toISOString()
  const row = buildPresenceRow(config, lastSeenIso)
  const url = `${config.supabaseUrl}/rest/v1/operator_agent_presence?on_conflict=founder_id,agent_id`

  try {
    const res = await deps.fetch(url, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([row]),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, error: `presence upsert failed: ${res.status}${detail ? ` ${detail}` : ''}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'presence upsert threw' }
  }
}

export interface HeartbeatLoop {
  stop: () => void
}

/**
 * Start the heartbeat loop: beat immediately, then every config.intervalMs.
 * Returns a stop handle. Logging is injected so it's silent in tests.
 */
export function startHeartbeat(
  config: PresenceConfig,
  deps: HeartbeatDeps,
  log: (msg: string) => void = () => {},
): HeartbeatLoop {
  let stopped = false

  const beat = async () => {
    if (stopped) return
    const result = await sendHeartbeat(config, deps)
    if (!result.ok) log(`heartbeat error: ${result.error}`)
  }

  void beat()
  const timer = setInterval(() => void beat(), config.intervalMs)
  // Don't keep the event loop alive solely for the heartbeat.
  if (typeof timer.unref === 'function') timer.unref()

  return {
    stop: () => {
      stopped = true
      clearInterval(timer)
    },
  }
}
