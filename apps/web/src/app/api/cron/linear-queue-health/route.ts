// src/app/api/cron/linear-queue-health/route.ts
// GET /api/cron/linear-queue-health
//
// UNI-2145 — Health surface for the autonomous Linear claim loop (UNI-2143).
// Reports whether the loop is building, idle, blocked, stale, or misconfigured,
// with config readiness as present/absent booleans only (NO secret leakage).
// Read-only — makes no Linear mutations. CRON_SECRET-guarded.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import {
  fetchClaimCandidates,
  fetchMostRecentClaimAt,
  type LinearClaimCandidateRaw,
} from '@/lib/integrations/linear'
import { AUTONOMOUS_LABELS, type ClaimCandidate, type LinearStateType } from '@/lib/command-centre/linear-claim'
import { computeQueueHealth, buildConfigReadiness } from '@/lib/command-centre/linear-queue-health'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TEAM_KEY = 'UNI'
const PROJECT_NAME = 'Unite-Group'
const DEFAULT_STALE_MS = 30 * 60 * 1000 // 30 minutes

function toCandidate(raw: LinearClaimCandidateRaw): ClaimCandidate {
  return {
    id: raw.id,
    identifier: raw.identifier,
    title: raw.title,
    priority: raw.priority,
    description: raw.description,
    createdAt: raw.createdAt,
    url: raw.url,
    stateName: raw.state.name,
    stateType: raw.state.type as LinearStateType,
    labels: raw.labels.nodes.map(l => l.name),
    blockedByOpenCount: 0,
  }
}

function staleAfterMs(): number {
  const raw = Number(process.env.LINEAR_CLAIM_STALE_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STALE_MS
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const config = buildConfigReadiness({
    linearKey: process.env.LINEAR_API_KEY,
    live: process.env.CC_LINEAR_LIVE,
    teamKey: TEAM_KEY,
    projectName: PROJECT_NAME,
  })
  const now = new Date().toISOString()
  const interval = staleAfterMs()

  // When the loop is not configured, don't attempt any Linear calls.
  if (!config.ready) {
    return NextResponse.json(
      computeQueueHealth({ config, candidates: [], lastClaimedAt: null, now, staleAfterMs: interval }),
    )
  }

  try {
    const labelNames = [...AUTONOMOUS_LABELS]
    const [raw, lastClaimedAt] = await Promise.all([
      fetchClaimCandidates({ teamKey: TEAM_KEY, projectName: PROJECT_NAME, labelNames }),
      fetchMostRecentClaimAt({ teamKey: TEAM_KEY, projectName: PROJECT_NAME, labelNames }),
    ])
    const report = computeQueueHealth({
      config,
      candidates: raw.map(toCandidate),
      lastClaimedAt,
      now,
      staleAfterMs: interval,
    })
    return NextResponse.json(report)
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'queue health check failed') },
      { status: 500 },
    )
  }
}
