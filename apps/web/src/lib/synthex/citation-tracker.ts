// src/lib/synthex/citation-tracker.ts
//
// AI Citation Tracker for Synthex content.
// Monitors whether Synthex client content appears in AI search engine responses.
// This is the new KPI replacing raw traffic volume (GEO shift 2026).
//
// Production: calls AI search APIs (Perplexity, Google AIO, ChatGPT) when keys are present.
// Development / no-key: returns a structured mock with realistic data.
//
// Perplexity API key: PERPLEXITY_API_KEY env var.
// If absent → mock mode is activated automatically.

/** Discriminates whether a signal came from a real API call, was inferred from another signal, or is unavailable. */
export type CitationSignalSource = 'live' | 'inferred' | 'unavailable'

export interface CitationCheckResult {
  keyword: string
  contentUrl?: string
  checkedAt: string // ISO 8601
  // Perplexity check (via their API if available, else mock structure)
  perplexityMentioned: boolean
  perplexityPosition?: number // 1-10 if found in top citations
  // Google AI Overview check (inferred from presence patterns)
  googleAIOPresence: boolean
  // No public Google AIO API exists — this signal is always inferred from Perplexity presence, never live.
  googleAIOSource: CitationSignalSource
  // ChatGPT check
  chatgptMentioned: boolean
  // No public ChatGPT citation API exists — this signal is always unavailable, never live.
  chatgptSource: CitationSignalSource
  // Combined citation score
  citationScore: number // 0-100
  citationSources: string[] // which AI engines cited this content
}

export interface CitationReport {
  brandId: string
  period: string // "YYYY-MM"
  checks: CitationCheckResult[]
  avgCitationScore: number
  topCitedKeywords: string[]
  citationTrend: 'up' | 'down' | 'stable'
  generatedAt: string
}

interface CheckCitationOptions {
  mock?: boolean
}

interface GenerateReportOptions {
  mock?: boolean
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Determine whether we should use mock data. */
function shouldMock(options?: CheckCitationOptions): boolean {
  if (options?.mock === true) return true
  if (!process.env.PERPLEXITY_API_KEY) return true
  return false
}

/** Derive the current YYYY-MM period string. */
function currentPeriod(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Compute a combined citation score (0-100) from the three engine signals.
 * Weights: Perplexity 45%, Google AIO 35%, ChatGPT 20%.
 * Position bonus: if perplexityPosition is 1-3, add up to 10 points.
 */
function computeCitationScore(
  perplexityMentioned: boolean,
  perplexityPosition: number | undefined,
  googleAIOPresence: boolean,
  chatgptMentioned: boolean,
): number {
  let score = 0
  if (perplexityMentioned) {
    score += 45
    if (perplexityPosition !== undefined && perplexityPosition <= 3) {
      score += 10 - (perplexityPosition - 1) * 3 // pos 1→+10, pos 2→+7, pos 3→+4
    }
  }
  if (googleAIOPresence) score += 35
  if (chatgptMentioned) score += 20
  return Math.min(score, 100)
}

/** Build the list of engine names that cited the content. */
function buildCitationSources(
  perplexityMentioned: boolean,
  googleAIOPresence: boolean,
  chatgptMentioned: boolean,
): string[] {
  const sources: string[] = []
  if (perplexityMentioned) sources.push('perplexity')
  if (googleAIOPresence) sources.push('google-aio')
  if (chatgptMentioned) sources.push('chatgpt')
  return sources
}

// ─── mock implementation ────────────────────────────────────────────────────

/** Generate a deterministic-ish mock score for a keyword (0-100). */
function mockScoreForKeyword(keyword: string): number {
  // Use a simple hash of the keyword to keep results stable across calls.
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    hash = (hash * 31 + keyword.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 101 // 0-100
}

function mockCitationCheck(keyword: string, contentUrl?: string): CitationCheckResult {
  const base = mockScoreForKeyword(keyword)
  const perplexityMentioned = base > 30
  const perplexityPosition: number | undefined = perplexityMentioned
    ? (base % 10) + 1
    : undefined
  const googleAIOPresence = base > 50
  const chatgptMentioned = base > 20

  const citationScore = computeCitationScore(
    perplexityMentioned,
    perplexityPosition,
    googleAIOPresence,
    chatgptMentioned,
  )

  return {
    keyword,
    contentUrl,
    checkedAt: new Date().toISOString(),
    perplexityMentioned,
    perplexityPosition,
    googleAIOPresence,
    googleAIOSource: 'inferred',
    chatgptMentioned,
    chatgptSource: 'unavailable',
    citationScore,
    citationSources: buildCitationSources(perplexityMentioned, googleAIOPresence, chatgptMentioned),
  }
}

// ─── live implementation (Perplexity sonar API) ──────────────────────────────

/**
 * Call the Perplexity sonar API to check whether the keyword + optional URL appear
 * in an AI-generated answer. Returns null on network/API failure (caller degrades to mock).
 */
async function checkPerplexity(
  keyword: string,
  contentUrl?: string,
): Promise<{ mentioned: boolean; position?: number } | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) return null

  const query = contentUrl
    ? `Is "${keyword}" discussed at ${contentUrl} or cited by AI search engines?`
    : `Is "${keyword}" cited or discussed in AI search engine results?`

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content:
              'You are a citation analyst. Answer concisely: yes/no and the position (1-10) if found in top citations.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      console.error(`[CitationTracker] Perplexity API error: ${response.status}`)
      return null
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = body.choices?.[0]?.message?.content?.toLowerCase() ?? ''
    const mentioned = text.includes('yes') || text.includes('found') || text.includes('cited')

    // Try to extract a position number from the response
    const posMatch = text.match(/position[:\s]+(\d+)|#(\d+)|rank[:\s]+(\d+)/i)
    const position = posMatch
      ? parseInt(posMatch[1] ?? posMatch[2] ?? posMatch[3], 10)
      : undefined

    return { mentioned, position }
  } catch (err) {
    console.error('[CitationTracker] Perplexity fetch failed:', err)
    return null
  }
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Check citation for a single keyword + optional URL.
 *
 * In production this calls AI search APIs.
 * Falls back to structured mock when PERPLEXITY_API_KEY is absent or options.mock is true.
 * A console.warn is emitted when running in mock mode.
 */
export async function checkCitation(
  keyword: string,
  contentUrl?: string,
  options?: CheckCitationOptions,
): Promise<CitationCheckResult> {
  if (shouldMock(options)) {
    console.warn(
      '[CitationTracker] Running in mock mode — set PERPLEXITY_API_KEY to enable live checks.',
    )
    return mockCitationCheck(keyword, contentUrl)
  }

  // Live path: Perplexity sonar for primary signal.
  // Google AIO and ChatGPT integrations are stubbed until their APIs are available.
  const perplexityResult = await checkPerplexity(keyword, contentUrl)

  const perplexityMentioned = perplexityResult?.mentioned ?? false
  const perplexityPosition = perplexityResult?.position

  // Google AIO presence: inferred — no public API; use mock-derived signal for now.
  // TODO: replace with real Google SGE / AIO API when available.
  const googleAIOPresence = perplexityMentioned // conservative: correlate with Perplexity signal

  // ChatGPT: no public citation API; stubbed as false until OpenAI exposes one.
  const chatgptMentioned = false

  const citationScore = computeCitationScore(
    perplexityMentioned,
    perplexityPosition,
    googleAIOPresence,
    chatgptMentioned,
  )

  return {
    keyword,
    contentUrl,
    checkedAt: new Date().toISOString(),
    perplexityMentioned,
    perplexityPosition,
    googleAIOPresence,
    googleAIOSource: 'inferred',
    chatgptMentioned,
    chatgptSource: 'unavailable',
    citationScore,
    citationSources: buildCitationSources(perplexityMentioned, googleAIOPresence, chatgptMentioned),
  }
}

/**
 * Generate a monthly citation report for a brand.
 *
 * Runs checkCitation for each keyword sequentially (rate-limit friendly).
 * Derives avgCitationScore, topCitedKeywords, and citationTrend from the results.
 */
export async function generateCitationReport(
  brandId: string,
  keywords: string[],
  options?: GenerateReportOptions,
): Promise<CitationReport> {
  const period = currentPeriod()
  const checks: CitationCheckResult[] = []

  for (const keyword of keywords) {
    const result = await checkCitation(keyword, undefined, options)
    checks.push(result)
  }

  const avgCitationScore =
    checks.length > 0
      ? Math.round(checks.reduce((sum, c) => sum + c.citationScore, 0) / checks.length)
      : 0

  const topCitedKeywords = checks
    .filter((c) => c.citationScore >= 40)
    .sort((a, b) => b.citationScore - a.citationScore)
    .slice(0, 5)
    .map((c) => c.keyword)

  // Trend: in a real implementation this would compare against the previous month's stored report.
  // Without historical data, we infer from the current average score.
  const citationTrend: 'up' | 'down' | 'stable' =
    avgCitationScore >= 60 ? 'up' : avgCitationScore <= 20 ? 'down' : 'stable'

  return {
    brandId,
    period,
    checks,
    avgCitationScore,
    topCitedKeywords,
    citationTrend,
    generatedAt: new Date().toISOString(),
  }
}
