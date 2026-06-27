// src/app/api/cron/linear-handoff/route.ts
// GET /api/cron/linear-handoff
//
// Runner handoff for the Stage-3 autopilot runner (apps/autopilot-runner). It
// selects the next eligible autonomous Linear issue and returns its
// execution_packet for the runner to build.
//
// CLAIMING (the key to unattended operation):
//   - When CC_LINEAR_LIVE === '1', the handoff ATOMICALLY CLAIMS the issue it
//     returns — moves it to "In Progress" and writes a claim receipt — BEFORE
//     handing it off. Because selection only ever considers unstarted/backlog
//     issues, the next tick cannot re-select an already-claimed issue, so the
//     runner never opens duplicate PRs and can run unattended (no manual disarm
//     after each PR).
//   - When the gate is OFF, it stays a pure READ-ONLY dry-run (selects + returns
//     the packet, makes zero mutating Linear calls) — the safe default.
//
// CRON_SECRET-guarded. Never pushes to git/main — it only updates Linear state.
// Double-gated exactly like /api/cron/linear-claim (opts.live && CC_LINEAR_LIVE).

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import {
  fetchClaimCandidates,
  resolveStateId,
  updateIssueState,
  addComment,
  type LinearClaimCandidateRaw,
} from '@/lib/integrations/linear'
import {
  claimNextEligibleIssue,
  AUTONOMOUS_LABELS,
  type ClaimCandidate,
  type LinearStateType,
} from '@/lib/command-centre/linear-claim'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TEAM_KEY = 'UNI'
const IN_PROGRESS_STATE = 'In Progress'

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

  // Live claim requires the explicit env gate; otherwise this is a read-only dry-run.
  const live = process.env.CC_LINEAR_LIVE === '1'

  const readOnly = async () => {
    throw new Error('linear-handoff is read-only (CC_LINEAR_LIVE != 1)')
  }

  try {
    const result = await claimNextEligibleIssue(
      {
        listCandidates: async () => {
          // Scope by team + autonomous labels only — NOT by Linear project. The
          // autonomous opt-in IS the label (mesh:auto / pi-dev:autonomous); a
          // project filter dropped every project-less issue, which is exactly what
          // [Apply] and the working UNI-2176 smoke test (#381) create — so the
          // handoff returned candidates_total: 0 and the runner never built.
          const raw = await fetchClaimCandidates({
            teamKey: TEAM_KEY,
            labelNames: [...AUTONOMOUS_LABELS],
          })
          return raw.map(toCandidate)
        },
        moveToInProgress: live
          ? async (issueId: string) => {
              const stateId = await resolveStateId(TEAM_KEY, IN_PROGRESS_STATE)
              await updateIssueState(issueId, stateId)
            }
          : readOnly,
        postComment: live
          ? async (issueId: string, body: string) => {
              await addComment(issueId, body)
            }
          : readOnly,
      },
      {
        live,
        runner: live ? 'pi-dev-autopilot' : 'rana-cli',
        runId: `handoff-${new Date().toISOString()}`,
      },
    )

    return NextResponse.json({
      ok: true,
      source: 'command-centre:linear-handoff',
      ...result,
      next_action: result.execution_packet ? 'claim_and_build' : 'idle',
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: sanitiseError(err, 'linear handoff failed') },
      { status: 500 },
    )
  }
}
