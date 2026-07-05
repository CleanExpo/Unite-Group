// GET /api/command-centre/team-activity
// Founder-scoped per-person contractor activity for the Mission Control deck.
// GitHub commits by author across each roster member's own repos, bucketed
// per contractor. Every figure is activity-derived, NOT clock hours (see
// ACTIVITY_DISCLAIMER).

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { buildTeamActivity, TEAM_ROSTER } from '@/lib/command-centre/team-activity'
import { fetchTeamCommits } from '@/lib/command-centre/team-activity-github'

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 14

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const now = new Date()
    const sinceIso = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const repos = [...new Set(TEAM_ROSTER.flatMap((m) => m.repos))]

    const { commits, failures } = await fetchTeamCommits(repos, sinceIso, { token: process.env.GITHUB_TOKEN })

    // All repos failed: degrade honestly (not_connected if that's uniformly why,
    // else error). Some repos ok: stay 'live' — the other members' commits are
    // still real — but note which repos failed so nothing is silently dropped.
    const allFailed = failures.length > 0 && failures.length === repos.length
    const allNotConnected = allFailed && failures.every((f) => f.reason === 'not_connected')

    const commitsInput = allFailed
      ? {
          ok: false as const,
          reason: (allNotConnected ? 'not_connected' : 'error') as 'not_connected' | 'error',
          detail: failures[0]?.detail,
        }
      : {
          ok: true as const,
          commits,
          detail:
            failures.length > 0
              ? `${repos.length - failures.length}/${repos.length} repos fetched — failed: ${failures
                  .map((f) => `${f.repo} (${f.detail ?? f.reason})`)
                  .join('; ')}`
              : undefined,
        }

    const payload = buildTeamActivity({
      now: now.toISOString(),
      repo: repos.join(', '),
      windowDays: WINDOW_DAYS,
      commits: commitsInput,
    })

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'team-activity failed') }, { status: 500 })
  }
}
