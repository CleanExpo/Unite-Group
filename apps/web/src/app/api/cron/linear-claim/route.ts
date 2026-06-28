// src/app/api/cron/linear-claim/route.ts
// GET /api/cron/linear-claim
//
// UNI-2143 — Autonomous Linear claim loop (scheduled or manual runner).
// Claims the next eligible `mesh:auto` / `pi-dev:autonomous` issue from the
// Unite-Group Linear project: filters by autonomous label + Todo/Backlog state
// + not blocked + acceptance criteria present, picks the highest priority, moves
// it to "In Progress", and writes a claim receipt comment.
//
// SAFETY: DRY-RUN unless `CC_LINEAR_LIVE === '1'` (same gate as linear-sync).
// CRON_SECRET-guarded. Never pushes to git/main — it only updates Linear.
//
// NOTE: This is NOT a scheduled Vercel cron. The Stage-3 autopilot runner now
// claims atomically via /api/cron/linear-handoff (claim-on-handoff when live),
// so a standalone claim cron would move issues to "In Progress" without building
// them (orphans) and race the runner. This route is retained for manual / ad-hoc
// claims only. See apps/autopilot-runner and the linear-handoff route.

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
const PROJECT_NAME = 'Unite-Group'
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
    labels: raw.labels.nodes.map(l => l.name),
    // Blocker detection on the live path uses the repo's blocker-reason label
    // convention (e.g. pi-dev:blocked-reason:credentials). Relation-based
    // blockedBy is supported by the core logic and can be wired in later.
    blockedByOpenCount: 0,
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Live writes require the explicit env gate; otherwise this is a safe dry-run.
  const live = process.env.CC_LINEAR_LIVE === '1'

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
        moveToInProgress: async (issueId: string) => {
          const stateId = await resolveStateId(TEAM_KEY, IN_PROGRESS_STATE)
          await updateIssueState(issueId, stateId)
        },
        postComment: async (issueId: string, body: string) => {
          await addComment(issueId, body)
        },
      },
      { live, runner: 'pi-dev-autopilot', runId: `cron-${new Date().toISOString()}` },
    )

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: sanitiseError(err, 'claim loop failed') },
      { status: 500 },
    )
  }
}
