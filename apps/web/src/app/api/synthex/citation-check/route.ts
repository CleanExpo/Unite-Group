// src/app/api/synthex/citation-check/route.ts
//
// POST /api/synthex/citation-check
//
// Generates an AI citation report for a brand's keywords.
// Protected by CRON_SECRET (same pattern as existing cron routes) — this endpoint
// is called from scheduled jobs and internal tooling, not from the browser.
//
// Body: { brandId: string, keywords: string[], contentUrls?: string[] }
// Response: CitationReport

import { NextResponse } from 'next/server'
import { generateCitationReport } from '@/lib/synthex/citation-tracker'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface CitationCheckBody {
  brandId: string
  keywords: string[]
  contentUrls?: string[]
}

export async function POST(request: Request): Promise<Response> {
  // ── Auth: CRON_SECRET bearer token ────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: CitationCheckBody
  try {
    body = (await request.json()) as CitationCheckBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { brandId, keywords, contentUrls } = body

  if (!brandId || typeof brandId !== 'string' || brandId.trim() === '') {
    return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
  }

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json(
      { error: 'keywords must be a non-empty array of strings' },
      { status: 400 },
    )
  }

  if (keywords.some((k) => typeof k !== 'string' || k.trim() === '')) {
    return NextResponse.json(
      { error: 'All keywords must be non-empty strings' },
      { status: 400 },
    )
  }

  // Silently accept contentUrls for future use (e.g. per-keyword URL mapping).
  // Currently generateCitationReport runs keyword-level checks; URL association
  // will be wired once the Perplexity API integration is fully live.
  void contentUrls

  // ── Generate report ───────────────────────────────────────────────────────
  try {
    const report = await generateCitationReport(brandId.trim(), keywords)
    return NextResponse.json(report)
  } catch (error) {
    console.error('[citation-check] Report generation failed:', error)
    return NextResponse.json(
      {
        error: 'Citation report generation failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
