// src/app/api/research/external-sources/route.ts
// POST: Structured external-source research (UNI-2135).
// Body: { query: string, limit?: number }
//
// Searches GitHub repositories and Hugging Face models/datasets, returning an
// honestly-statused report. Distinct from /api/research, which runs LLM web
// search. Founder-scoped (auth required). Env tokens + timestamp are read here
// and injected into the pure capability — the capability never touches
// process.env or the wall clock.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { researchExternalSources } from '@/lib/research/external-sources'

export const dynamic = 'force-dynamic'

const MAX_QUERY_LENGTH = 500

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let query: string
  let limit: number | undefined

  try {
    const body = (await request.json()) as { query?: unknown; limit?: unknown }
    query = typeof body.query === 'string' ? body.query : ''
    limit = typeof body.limit === 'number' ? body.limit : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const trimmed = query.trim()
  if (!trimmed) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `query exceeds ${MAX_QUERY_LENGTH} character limit` },
      { status: 400 }
    )
  }

  try {
    const report = await researchExternalSources(trimmed, {
      githubToken: process.env.GITHUB_TOKEN ?? null,
      hfToken: process.env.HF_API_TOKEN ?? null,
      fetchImpl: fetch,
      generatedAt: new Date().toISOString(),
      limit,
    })

    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: 'External-source research service unavailable' },
      { status: 500 }
    )
  }
}
