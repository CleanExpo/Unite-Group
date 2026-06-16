// src/app/api/cron/linear-handoff/route.ts
// GET /api/cron/linear-handoff
//
// Read-only runner handoff for RANA / CLI. It selects the same next eligible
// autonomous Linear issue as the claim loop and returns the execution_packet,
// but does NOT move the issue or write comments. CRON_SECRET-guarded.

import { NextResponse } from 'next/server'
import {
  fetchClaimCandidates,
  type LinearClaimCandidateRaw,
} from '@/lib/integrations/linear'
import {
  claimNextEligibleIssue,
  AUTONOMOUS_LABELS,
  type ClaimCandidate,
  type LinearStateType,
} from '@/lib/command-centre/linear-claim'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TEAM_KEY = 'UNI'
const PROJECT_NAME = 'Unite-Group'

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
    labels: raw.labels.nodes.map(label => label.name),
    blockedByOpenCount: 0,
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET.trim()}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const result = await claimNextEligibleIssue(
      {
        listCandidates: async () => {
          const raw = await fetchClaimCandidates({
            teamKey: TEAM_KEY,
            projectName: PROJECT_NAME,
            labelNames: [...AUTONOMOUS_LABELS],
          })
          return raw.map(toCandidate)
        },
        moveToInProgress: async () => {
          throw new Error('linear-handoff is read-only')
        },
        postComment: async () => {
          throw new Error('linear-handoff is read-only')
        },
      },
      {
        live: false,
        runner: 'rana-cli',
        runId: `handoff-${new Date().toISOString()}`,
      },
    )

    return NextResponse.json({
      ok: true,
      source: 'command-centre:linear-handoff',
      ...result,
      next_action: result.execution_packet
        ? 'claim_and_build'
        : 'idle',
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'linear handoff failed' },
      { status: 500 },
    )
  }
}
