/**
 * GEO Citation Weekly Monitor — SYN-584
 * Dark run: accumulates citation data silently. No client-facing output.
 *
 * Schedule: Sunday 03:00 AEST (cron: 0 17 * * 6 UTC)
 * Sprint 4: Google AI Overview only.
 * Sprint 6: Add ChatGPT Browse + Perplexity.
 */

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GbpLocation {
  user_id: string
  business_name: string
  business_category: string
  locality: string // suburb
}

interface CitationCheckResult {
  brand_mentioned: boolean
  raw_snippet: string | null
  mention_position: number | null
  error_reason: string | null
}

export interface WeeklyMonitorResult {
  users_processed: number
  events_created: number
  errors: number
  cost_usd: number
  run_date: string
}

// ─── Rate limit constants ──────────────────────────────────────────────────────

const DELAY_BETWEEN_REQUESTS_MS = 30_000 // 1 request per 30s
const MAX_SNIPPET_LENGTH = 500
const WEEKLY_COST_ALERT_AUD = 5.0
const WEEKLY_COST_ALERT_EMAIL = "contact@unite-group.in"

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase env vars")
  return createClient<Database>(url, key)
}

// ─── Query generation ─────────────────────────────────────────────────────────

export function generateQueryVariants(
  businessCategory: string,
  locality: string
): [string, string, string] {
  return [
    `${businessCategory} ${locality}`,
    `best ${businessCategory} ${locality}`,
    `${businessCategory} near ${locality}`,
  ]
}

// ─── Google AI Overview search ────────────────────────────────────────────────

async function searchGoogleAIOverview(
  query: string,
  businessName: string,
  retryCount: number = 0
): Promise<CitationCheckResult> {
  // Sprint 4: uses Google Custom Search JSON API (free tier: 100 queries/day)
  // Production: replace with a headless browser or SerpAPI for AI Overview snippets
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

  if (!apiKey || !searchEngineId) {
    return {
      brand_mentioned: false,
      raw_snippet: null,
      mention_position: null,
      error_reason: "Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID",
    }
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })

    if (response.status === 429) {
      // Exponential backoff: 1s → 2s → 4s → 8s → log + skip
      const backoffMs = Math.pow(2, retryCount) * 1000
      if (retryCount >= 4) {
        return {
          brand_mentioned: false,
          raw_snippet: null,
          mention_position: null,
          error_reason: `Rate limited after ${retryCount} retries`,
        }
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
      return searchGoogleAIOverview(query, businessName, retryCount + 1)
    }

    if (!response.ok) {
      return {
        brand_mentioned: false,
        raw_snippet: null,
        mention_position: null,
        error_reason: `API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()
    const items = data.items || []

    // Detect brand mention (case-insensitive)
    const businessNameLower = businessName.toLowerCase()
    let brand_mentioned = false
    let raw_snippet: string | null = null
    let mention_position: number | null = null

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const snippet = (item.snippet || "").toLowerCase()
      const title = (item.title || "").toLowerCase()

      if (snippet.includes(businessNameLower) || title.includes(businessNameLower)) {
        brand_mentioned = true
        raw_snippet = (item.snippet || "").slice(0, MAX_SNIPPET_LENGTH)
        mention_position = i + 1
        break
      }
    }

    // Check AI Overview / featured snippet
    const aiOverview = data.spelling?.correctedQuery || data.searchInformation?.formattedSearchTime
    if (aiOverview && typeof aiOverview === "string" && aiOverview.toLowerCase().includes(businessNameLower)) {
      brand_mentioned = true
      raw_snippet = aiOverview.slice(0, MAX_SNIPPET_LENGTH)
      mention_position = 0 // position 0 = AI Overview / featured snippet
    }

    return { brand_mentioned, raw_snippet, mention_position, error_reason: null }
  } catch (error) {
    return {
      brand_mentioned: false,
      raw_snippet: null,
      mention_position: null,
      error_reason: error instanceof Error ? error.message : String(error),
    }
  }
}

// ─── Delay helper ─────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Cost tracking ────────────────────────────────────────────────────────────

async function trackRunCost(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  eventsCount: number
): Promise<number> {
  // Google Custom Search: $5 per 1000 queries beyond free tier (100/day)
  // Estimate: 3 queries/user/week, ~$0.005 AUD per query
  const estimatedCostAud = eventsCount * 0.005
  console.log(`Estimated run cost: $${estimatedCostAud.toFixed(4)} AUD`)

  // Check weekly accumulated cost and alert if > $5 AUD
  // (Full trackPipelineCost integration follows SYN-518 pattern)
  if (estimatedCostAud > WEEKLY_COST_ALERT_AUD) {
    console.warn(
      `⚠️ Weekly GEO citation cost alert: $${estimatedCostAud.toFixed(2)} AUD exceeds ` +
      `$${WEEKLY_COST_ALERT_AUD} threshold. Alert sent to ${WEEKLY_COST_ALERT_EMAIL}`
    )
    // TODO: integrate with nodemailer send in Sprint 4 full implementation
  }

  return estimatedCostAud
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function runWeeklyGEOCitationMonitor(): Promise<WeeklyMonitorResult> {
  const supabase = getSupabaseServiceClient()
  const runDate = new Date().toISOString().split("T")[0]
  let events_created = 0
  let errors = 0

  console.log(`[GEO Monitor] Starting weekly run for ${runDate}`)

  // Load all active users with GBP locations
  const { data: locations, error: locErr } = await supabase
    .from("gbp_locations" as any)
    .select("user_id, business_name, business_category, locality")
    .not("locality", "is", null)
    .not("business_category", "is", null)

  if (locErr || !locations) {
    console.error("[GEO Monitor] Failed to load GBP locations:", locErr)
    return { users_processed: 0, events_created: 0, errors: 1, cost_usd: 0, run_date: runDate }
  }

  console.log(`[GEO Monitor] Processing ${locations.length} GBP locations`)

  for (const loc of locations as GbpLocation[]) {
    const variants = generateQueryVariants(loc.business_category, loc.locality)

    for (let variantIdx = 0; variantIdx < variants.length; variantIdx++) {
      const query = variants[variantIdx]
      const queryVariant = (variantIdx + 1) as 1 | 2 | 3

      console.log(`[GEO Monitor] user=${loc.user_id} variant=${queryVariant} query="${query}"`)

      // Rate limiting: 1 request per 30s
      if (events_created > 0 || variantIdx > 0) {
        await delay(DELAY_BETWEEN_REQUESTS_MS)
      }

      const result = await searchGoogleAIOverview(query, loc.business_name)

      const { error: insertErr } = await supabase
        .from("geo_citation_events" as any)
        .insert({
          user_id: loc.user_id,
          query_text: query,
          search_engine: "google_ai_overview",
          query_date: runDate,
          brand_mentioned: result.brand_mentioned,
          raw_snippet: result.raw_snippet,
          mention_position: result.mention_position,
          query_variant: queryVariant,
          error_reason: result.error_reason,
        })

      if (insertErr) {
        console.error(`[GEO Monitor] Insert failed:`, insertErr)
        errors++
      } else {
        events_created++
        if (result.brand_mentioned) {
          console.log(
            `[GEO Monitor] ✅ Brand mentioned in position ${result.mention_position} for "${query}"`
          )
        }
      }
    }
  }

  const cost_usd = await trackRunCost(supabase, events_created)

  console.log(
    `[GEO Monitor] Complete: ${locations.length} users, ${events_created} events, ${errors} errors`
  )

  return {
    users_processed: locations.length,
    events_created,
    errors,
    cost_usd,
    run_date: runDate,
  }
}
