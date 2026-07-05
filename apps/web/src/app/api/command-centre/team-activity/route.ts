// GET /api/command-centre/team-activity
// Founder-scoped per-person contractor activity for the Mission Control deck.
// GitHub commits by author on CleanExpo/CCW-CRM, bucketed per contractor.
// Every figure is activity-derived, NOT clock hours (see ACTIVITY_DISCLAIMER).

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { buildTeamActivity } from '@/lib/command-centre/team-activity'
import { makeGithubCommitFetcher } from '@/lib/command-centre/team-activity-github'

export const dynamic = 'force-dynamic'

const TARGET_REPO = 'CleanExpo/CCW-CRM'
const WINDOW_DAYS = 14

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const now = new Date()
    const sinceIso = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const fetchCommits = makeGithubCommitFetcher({ token: process.env.GITHUB_TOKEN })
    const commits = await fetchCommits(TARGET_REPO, sinceIso)

    const payload = buildTeamActivity({
      now: now.toISOString(),
      repo: TARGET_REPO,
      windowDays: WINDOW_DAYS,
      commits,
    })

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'team-activity failed') }, { status: 500 })
  }
}
