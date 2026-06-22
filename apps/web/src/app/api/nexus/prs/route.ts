// GET /api/nexus/prs
// Lists open PRs tagged nexus-pending-approval across all configured repos.
// Returns PR details, file change counts, diff previews (≤3 files), and AI summaries.
// Repos are set via NEXUS_REPOS env var (comma-separated owner/repo pairs).

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  fetchNexusPendingPRs,
  isNexusGitHubConfigured,
  getNexusRepos,
} from '@/lib/nexus/github-prs'
import { summarisePRs } from '@/lib/nexus/pr-summariser'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (!isNexusGitHubConfigured()) {
    return NextResponse.json({ status: 'not_configured', prs: [], repos: [] })
  }

  const repos = getNexusRepos()
  if (!repos.length) {
    return NextResponse.json({ status: 'no_repos', prs: [], repos: [] })
  }

  try {
    const prs = await fetchNexusPendingPRs()
    const withSummaries = await summarisePRs(prs)
    return NextResponse.json({ status: 'ok', prs: withSummaries, repos })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch PRs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
