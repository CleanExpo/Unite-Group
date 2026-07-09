// GET /api/cron/os-health-rollup
// UNI-2229 — periodic rollup of the already-live in-repo signal sources
// (portfolio CI + Linear P0/P1, Pi-CEO mesh fleet, Margot operational state,
// email-account vault) into the `dashboard_health` table. This cron becomes
// the SOLE writer of that table — the founder OS Health tile
// (dashboard-health-supabase.ts) reads it, normalising status/severity and
// flagging rows older than 26h as stale.
//
// Honesty rules (NorthStar "no fake-as-real"): a source with no upstream
// credentials is AMBER with a `not_configured`/`no_key` reason — absence of
// signal is never dressed up as an outage (RED). A source whose fetch throws
// is caught per-source and upserted as AMBER with `detail.error` rather than
// crashing the whole rollup or fabricating GREEN.
//
// Schedule: every 15 minutes (vercel.json).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  PORTFOLIO_REPOS,
  buildPortfolioHealth,
} from '@/lib/command-centre/portfolio-health'
import {
  makeGithubRunsFetcher,
  makeLinearP0P1Fetcher,
} from '@/lib/command-centre/portfolio-health-fetchers'
import {
  deriveMargotHealth,
  type MargotVoiceRead,
  type MargotPresenceRead,
} from '@/lib/command-centre/margot-health'
import {
  deriveEmailAccounts,
  EMAIL_PROVIDERS,
  type VaultRow,
} from '@/lib/command-centre/email-accounts'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MARGOT_WINDOW_DAYS = 14
const MESH_FETCH_TIMEOUT_MS = 8000

type HealthStatus = 'GREEN' | 'AMBER' | 'RED'

interface HealthRow {
  id: string
  title: string
  status: HealthStatus
  severity: string
  detail: Record<string, unknown>
}

type ServiceClient = ReturnType<typeof createServiceClient>

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error'
}

// --- portfolio-health --------------------------------------------------

async function buildPortfolioRow(): Promise<HealthRow> {
  const title = 'Portfolio CI + Linear P0/P1'
  const githubToken = process.env.GITHUB_TOKEN?.trim()

  if (!githubToken) {
    return {
      id: 'portfolio-health',
      title,
      status: 'AMBER',
      severity: 'informational',
      detail: { reason: 'not_configured', source: 'not_configured' },
    }
  }

  const payload = await buildPortfolioHealth({
    repos: PORTFOLIO_REPOS,
    fetchRuns: makeGithubRunsFetcher(githubToken),
    fetchP0P1: makeLinearP0P1Fetcher(process.env.LINEAR_API_KEY?.trim()),
    now: new Date().toISOString(),
  })

  // red -> outage (RED); green -> clean (GREEN); yellow/grey -> degraded
  // signal, not an outage (AMBER) — absence/flakiness is never fabricated red.
  const status: HealthStatus =
    payload.overall === 'red' ? 'RED' : payload.overall === 'green' ? 'GREEN' : 'AMBER'
  const severity =
    payload.overall === 'red' ? 'P1' : payload.overall === 'yellow' ? 'P2' : 'informational'

  return {
    id: 'portfolio-health',
    title,
    status,
    severity,
    detail: {
      overall: payload.overall,
      source: payload.source,
      openP0P1: payload.openP0P1,
      linearSource: payload.linearSource,
      repos: payload.repos.map((r) => ({ repo: r.repo, color: r.color, error: r.error ?? null })),
    },
  }
}

// --- mesh-fleet ----------------------------------------------------------
// No extracted lib for the mesh-fleet upstream call — mirrors the honest
// not_configured/no_key/upstream_error/timeout states inlined in
// src/app/api/command-centre/mesh-fleet/route.ts, calling the Railway
// Pi-CEO API directly (never a self-call to our own route).

interface MeshMachine {
  is_stale?: boolean
}

interface MeshFleetUpstream {
  machines?: MeshMachine[]
  ships?: unknown[]
}

async function buildMeshFleetRow(): Promise<HealthRow> {
  const title = 'Pi-CEO Mesh Fleet'
  const piCeoUrl = process.env.PI_CEO_API_URL?.trim()
  const piCeoKey = process.env.PI_CEO_API_KEY?.trim()

  if (!piCeoUrl) {
    return {
      id: 'mesh-fleet',
      title,
      status: 'AMBER',
      severity: 'informational',
      detail: { reason: 'not_configured' },
    }
  }
  if (!piCeoKey) {
    return {
      id: 'mesh-fleet',
      title,
      status: 'AMBER',
      severity: 'informational',
      detail: { reason: 'no_key' },
    }
  }

  try {
    const res = await fetch(`${piCeoUrl}/api/mesh/fleet`, {
      headers: { 'X-Pi-CEO-Secret': piCeoKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(MESH_FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      return {
        id: 'mesh-fleet',
        title,
        status: 'AMBER',
        severity: 'P2',
        detail: { reason: 'upstream_error', error: `HTTP ${res.status}` },
      }
    }

    const data = (await res.json()) as MeshFleetUpstream
    const machines = Array.isArray(data.machines) ? data.machines : []
    const shipCount = Array.isArray(data.ships) ? data.ships.length : 0
    const allStale = machines.length === 0 || machines.every((m) => m.is_stale)

    return {
      id: 'mesh-fleet',
      title,
      status: allStale ? 'AMBER' : 'GREEN',
      severity: allStale ? 'informational' : 'informational',
      detail: {
        reason: allStale ? 'all_stale' : undefined,
        machineCount: machines.length,
        shipCount,
      },
    }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return {
      id: 'mesh-fleet',
      title,
      status: 'AMBER',
      severity: 'P2',
      detail: { reason: timedOut ? 'timeout' : 'error', error: toErrorMessage(err) },
    }
  }
}

// --- margot ----------------------------------------------------------------
// Single-tenant cron actor per src/app/api/CLAUDE.md: FOUNDER_USER_ID stands
// in for the session-scoped user() the interactive margot-health route uses.

async function buildMargotRow(supabase: ServiceClient): Promise<HealthRow> {
  const title = 'Margot Operational State'
  const founderId = process.env.FOUNDER_USER_ID?.trim()

  if (!founderId) {
    return {
      id: 'margot',
      title,
      status: 'AMBER',
      severity: 'informational',
      detail: { reason: 'not_configured' },
    }
  }

  const now = new Date()
  const sinceIso = new Date(now.getTime() - MARGOT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [voiceRes, latestVoiceRes, presenceRes] = await Promise.all([
    supabase
      .from('margot_voice_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('founder_id', founderId)
      .gte('created_at', sinceIso),
    supabase
      .from('margot_voice_sessions')
      .select('created_at')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('operator_agent_presence')
      .select('last_seen_at')
      .eq('founder_id', founderId)
      .order('last_seen_at', { ascending: false })
      .limit(500),
  ])

  const voice: MargotVoiceRead =
    voiceRes.error || latestVoiceRes.error
      ? { ok: false, latestSessionAt: null, sessionsInWindow: 0, error: 'voice read failed' }
      : {
          ok: true,
          latestSessionAt: latestVoiceRes.data?.[0]?.created_at ?? null,
          sessionsInWindow: voiceRes.count ?? 0,
        }

  const presence: MargotPresenceRead = presenceRes.error
    ? { ok: false, latestSeenAt: null, agentCount: 0, error: 'presence read failed' }
    : {
        ok: true,
        latestSeenAt: presenceRes.data?.[0]?.last_seen_at ?? null,
        agentCount: presenceRes.data?.length ?? 0,
      }

  const payload = deriveMargotHealth({
    now: now.toISOString(),
    windowDays: MARGOT_WINDOW_DAYS,
    config: {
      elevenLabsApiKey: !!process.env.ELEVENLABS_API_KEY?.trim(),
      margotAgentId: !!process.env.ELEVENLABS_MARGOT_AGENT_ID?.trim(),
      ingestToken: !!process.env.ELEVENLABS_INGEST_TOKEN?.trim(),
      founderConfigured: true,
    },
    voice,
    presence,
  })

  const readFailed = payload.voice.source === 'error' || payload.agents.source === 'error'
  const hasRecentSession = !!payload.voice.latestSessionAt
  const status: HealthStatus = readFailed || !hasRecentSession ? 'AMBER' : 'GREEN'

  return {
    id: 'margot',
    title,
    status,
    severity: status === 'GREEN' ? 'informational' : 'P3',
    detail: {
      reason: readFailed ? 'read_failed' : hasRecentSession ? undefined : 'no_recent_session',
      voiceReady: payload.voiceReady,
      latestSessionAt: payload.voice.latestSessionAt,
      sessionsInWindow: payload.voice.sessionsInWindow,
      activeAgents: payload.agents.activeCount,
    },
  }
}

// --- email-accounts ----------------------------------------------------

async function buildEmailAccountsRow(supabase: ServiceClient): Promise<HealthRow> {
  const title = 'Email Account Roster'
  const founderId = process.env.FOUNDER_USER_ID?.trim()

  if (!founderId) {
    return {
      id: 'email-accounts',
      title,
      status: 'AMBER',
      severity: 'informational',
      detail: { reason: 'not_configured' },
    }
  }

  const { data, error } = await supabase
    .from('credentials_vault')
    .select('service, updated_at, last_accessed_at, metadata')
    .eq('founder_id', founderId)

  if (error) throw new Error(error.message)

  const vaultRows = (data ?? []) as VaultRow[]
  const envKeys = EMAIL_PROVIDERS.flatMap((p) => p.envKeys ?? [])
  const envPresent = Object.fromEntries(envKeys.map((k) => [k, !!process.env[k]?.trim()]))

  const payload = deriveEmailAccounts({
    now: new Date().toISOString(),
    vaultRows,
    envPresent,
  })

  const status: HealthStatus = payload.summary.connected === 0 ? 'AMBER' : 'GREEN'

  return {
    id: 'email-accounts',
    title,
    status,
    severity: status === 'GREEN' ? 'informational' : 'P3',
    detail: {
      reason: status === 'AMBER' ? 'zero_connected' : undefined,
      summary: payload.summary,
    },
  }
}

// --- route -----------------------------------------------------------------

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const reportedAt = new Date().toISOString()

  const sources: Array<{ id: string; title: string; build: () => Promise<HealthRow> }> = [
    { id: 'portfolio-health', title: 'Portfolio CI + Linear P0/P1', build: buildPortfolioRow },
    { id: 'mesh-fleet', title: 'Pi-CEO Mesh Fleet', build: buildMeshFleetRow },
    { id: 'margot', title: 'Margot Operational State', build: () => buildMargotRow(supabase) },
    { id: 'email-accounts', title: 'Email Account Roster', build: () => buildEmailAccountsRow(supabase) },
  ]

  const upserted: string[] = []
  const errors: Array<{ id: string; error: string }> = []

  for (const { id, title, build } of sources) {
    let row: HealthRow
    try {
      row = await build()
    } catch (err) {
      // Honesty rule: a source that cannot be measured is AMBER with the
      // error recorded — never invented GREEN, never crash the rollup.
      row = {
        id,
        title,
        status: 'AMBER',
        severity: 'P3',
        detail: { error: toErrorMessage(err) },
      }
    }

    const { error } = await supabase.from('dashboard_health').upsert(
      {
        id: row.id,
        title: row.title,
        status: row.status,
        severity: row.severity,
        detail: row.detail,
        reported_at: reportedAt,
      },
      { onConflict: 'id' },
    )

    if (error) {
      errors.push({ id, error: error.message })
    } else {
      upserted.push(id)
    }
  }

  return NextResponse.json({ upserted, errors })
}
