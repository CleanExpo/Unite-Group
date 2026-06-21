import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { buildRepoCampaigns } from '@/lib/command-centre/repo-campaigns'
import { makeGithubRepoFetcher } from '@/lib/command-centre/repo-campaigns-github'

// Mission Control "Campaigns (repos)" overview. Founder-auth. Live GitHub signal
// when GITHUB_TOKEN is set; honest not_connected otherwise (no fake-as-real).
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const projects = await getProjects()
    const fetchSignal = makeGithubRepoFetcher({ token: process.env.GITHUB_TOKEN })
    const payload = await buildRepoCampaigns({ projects, fetchSignal, now: new Date().toISOString() })
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'repo-campaigns failed' },
      { status: 500 },
    )
  }
}
