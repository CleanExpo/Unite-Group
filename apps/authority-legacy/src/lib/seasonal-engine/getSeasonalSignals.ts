/**
 * Seasonal Engine — Get Seasonal Signals
 * SYN-590 stub: structural contract for the seasonal signals pipeline.
 *
 * Full implementation: Sprint 4 (uses ML metadata columns from SYN-583).
 * This stub exists so CI smoke tests can validate the output shape immediately.
 */

export interface SeasonalSignal {
  opportunity_name: string
  peak_date: string // ISO date string e.g. "2026-06-01"
  industry_relevance: "high" | "medium" | "low"
  suggested_content_type: string
  estimated_engagement_lift: number // multiplier e.g. 1.4 = 40% lift
}

export interface SeasonalSignalsResult {
  client_id: string
  industry: string
  state: string
  seasonal_signals: SeasonalSignal[]
  generated_at: string
  next_refresh_at: string
}

const STUB_SIGNALS_BY_INDUSTRY: Record<string, SeasonalSignal[]> = {
  trades: [
    {
      opportunity_name: "End of Financial Year — Trade Promotions",
      peak_date: "2026-06-30",
      industry_relevance: "high",
      suggested_content_type: "promotional",
      estimated_engagement_lift: 1.6,
    },
    {
      opportunity_name: "Winter Maintenance Season",
      peak_date: "2026-07-01",
      industry_relevance: "high",
      suggested_content_type: "educational",
      estimated_engagement_lift: 1.3,
    },
  ],
  retail: [
    {
      opportunity_name: "Back to School",
      peak_date: "2026-01-20",
      industry_relevance: "high",
      suggested_content_type: "promotional",
      estimated_engagement_lift: 1.8,
    },
  ],
  default: [
    {
      opportunity_name: "End of Financial Year",
      peak_date: "2026-06-30",
      industry_relevance: "medium",
      suggested_content_type: "promotional",
      estimated_engagement_lift: 1.2,
    },
  ],
}

/**
 * Returns seasonal market opportunity signals for a client.
 *
 * Stub: returns static signals based on industry.
 * Replace with ML-driven signal generation in Sprint 4 (SYN-583 schema + Claude call).
 */
export async function getSeasonalSignals(
  client_id: string,
  industry: string,
  state: string
): Promise<SeasonalSignalsResult> {
  const normalised = industry.toLowerCase()
  const signals =
    STUB_SIGNALS_BY_INDUSTRY[normalised] ?? STUB_SIGNALS_BY_INDUSTRY.default

  const now = new Date()
  const nextRefresh = new Date(now)
  nextRefresh.setDate(nextRefresh.getDate() + 7)

  return {
    client_id,
    industry,
    state,
    seasonal_signals: signals,
    generated_at: now.toISOString(),
    next_refresh_at: nextRefresh.toISOString(),
  }
}
