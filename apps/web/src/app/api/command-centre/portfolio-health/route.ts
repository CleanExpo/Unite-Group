// src/app/api/command-centre/portfolio-health/route.ts
//
// UNI-2201 — Portfolio Health proxy/aggregator. Founder-scoped read of live CI
// health across the RestoreAssist / Synthex / Nexus repos (GitHub Actions) plus
// the portfolio-wide open P0/P1 Linear count, reduced to red/yellow/green for
// the Mission Control deck. Same contract shape as the mesh-fleet route:
// getUser 401, an honest not_configured state when GITHUB_TOKEN is absent, and
// a source discriminator on every payload. Secrets are only ever attached to
// outbound request headers — never echoed to the client or logged.
//
// No snapshot table: the ticket's acceptance is "renders live data, refreshes
// every 60s" with no trend/history, so this is proxy/aggregate-only (per the
// operator-mcp source, which computes health live rather than persisting it).

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  PORTFOLIO_REPOS,
  buildPortfolioHealth,
  type PortfolioHealthPayload,
} from '@/lib/command-centre/portfolio-health'
import {
  makeGithubRunsFetcher,
  makeLinearP0P1Fetcher,
} from '@/lib/command-centre/portfolio-health-fetchers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const now = new Date().toISOString()
  const githubToken = process.env.GITHUB_TOKEN?.trim()

  if (!githubToken) {
    const payload: PortfolioHealthPayload = {
      configured: false,
      source: 'not_configured',
      repos: [],
      overall: 'grey',
      openP0P1: null,
      linearSource: 'not_configured',
      timestamp: now,
    }
    return NextResponse.json(payload)
  }

  const payload = await buildPortfolioHealth({
    repos: PORTFOLIO_REPOS,
    fetchRuns: makeGithubRunsFetcher(githubToken),
    fetchP0P1: makeLinearP0P1Fetcher(process.env.LINEAR_API_KEY?.trim()),
    now,
  })

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
