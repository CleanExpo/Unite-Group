/**
 * Seasonal Engine Pipeline — CI Smoke Test
 * SYN-590: Structural validity checks for seasonal signal generation.
 *
 * Asserts that seasonal signal generation returns a structurally valid output:
 * - seasonal_signals is a non-empty array
 * - Each signal has a non-null opportunity_name string
 * - Each signal has a non-null peak_date date string
 *
 * Failure here means the seasonal engine inserts structurally empty rows
 * into client calendars — invisible to error monitoring.
 */

import {
  getSeasonalSignals,
  SeasonalSignal,
} from "../../src/lib/seasonal-engine/getSeasonalSignals"

const TEST_CLIENT_ID = "smoke-test-client-trades-nsw"

describe("Seasonal Engine Pipeline Smoke Test", () => {
  it("(a) returns a result for trades/NSW client", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
    expect(result).not.toBeNull()
  })

  it("(b) result contains a seasonal_signals array", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
    expect(Array.isArray(result.seasonal_signals)).toBe(true)
  })

  it(
    "(c) seasonal_signals.length > 0\n" +
      "    Seasonal Engine smoke test FAILED: expected non-empty signals array — " +
      "check seasonal-engine pipeline and test client seed in Supabase dev",
    async () => {
      const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
      expect(result.seasonal_signals.length).toBeGreaterThan(0)
    }
  )

  it("(d) seasonal_signals[0].opportunity_name is a non-null string", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
    const first = result.seasonal_signals[0]

    expect(first.opportunity_name).not.toBeNull()
    expect(typeof first.opportunity_name).toBe("string")
    expect(first.opportunity_name.trim().length).toBeGreaterThan(0)
  })

  it("(e) seasonal_signals[0].peak_date is a non-null date string", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
    const first = result.seasonal_signals[0]

    expect(first.peak_date).not.toBeNull()
    expect(typeof first.peak_date).toBe("string")
    // Must be parseable as a date
    const parsed = new Date(first.peak_date)
    expect(parsed.getTime()).not.toBeNaN()
  })

  it("all signals have valid industry_relevance values", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
    const validValues: SeasonalSignal["industry_relevance"][] = ["high", "medium", "low"]

    for (const signal of result.seasonal_signals) {
      expect(validValues).toContain(signal.industry_relevance)
    }
  })

  it("all signals have a positive estimated_engagement_lift > 1.0", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")

    for (const signal of result.seasonal_signals) {
      expect(signal.estimated_engagement_lift).toBeGreaterThan(1.0)
    }
  })

  it("result includes client_id matching input", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "retail", "VIC")
    expect(result.client_id).toBe(TEST_CLIENT_ID)
  })

  it("result includes generated_at and next_refresh_at as valid ISO timestamps", async () => {
    const result = await getSeasonalSignals(TEST_CLIENT_ID, "trades", "NSW")
    expect(new Date(result.generated_at).getTime()).not.toBeNaN()
    expect(new Date(result.next_refresh_at).getTime()).not.toBeNaN()
    // next_refresh_at must be after generated_at
    expect(new Date(result.next_refresh_at) > new Date(result.generated_at)).toBe(true)
  })
})
