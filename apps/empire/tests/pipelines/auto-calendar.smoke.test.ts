/**
 * Auto-Calendar Pipeline — CI Smoke Test
 * SYN-590: Structural validity checks for content calendar generation.
 *
 * Asserts that calendar generation returns a structurally valid output:
 * - Returns a calendar with slots
 * - Each slot has a non-empty content/caption
 * - Each slot has a non-null scheduled_for timestamp
 *
 * Failures here mean the auto-publish pipeline would write empty posts to
 * client calendars without any error alert firing.
 */

const mockReadDigestSignals = jest.fn()
const mockScheduleSlots = jest.fn()
const mockGenerateCaptions = jest.fn()
const mockTrackPipelineCost = jest.fn()
const mockSupabaseSingle = jest.fn()

jest.mock("../../src/lib/calendar/digestReader", () => ({
  readDigestSignals: mockReadDigestSignals,
}))
jest.mock("../../src/lib/calendar/slotScheduler", () => ({
  scheduleSlots: mockScheduleSlots,
  getNextMonday: () => new Date("2026-04-06T00:00:00.000Z"),
}))
jest.mock("../../src/lib/calendar/captionGenerator", () => ({
  generateCaptions: mockGenerateCaptions,
}))
jest.mock("@/lib/pipelines/track-cost", () => ({
  trackPipelineCost: mockTrackPipelineCost,
}))
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: () => ({
        select: () => ({
          single: mockSupabaseSingle,
        }),
      }),
    }),
  }),
}))

import { generateWeeklyCalendar } from "../../src/lib/calendar/generateWeeklyCalendar"

const TEST_CLIENT_ID = "smoke-test-client-trades-nsw"
const TEST_CLIENT_CONTEXT = {
  business_name: "Test Trades Business",
  industry: "trades",
  brand_voice: "professional",
}

const MOCK_SIGNALS = {
  client_id: TEST_CLIENT_ID,
  top_content_types: ["educational", "promotional", "engagement"],
  peak_engagement_hours: [9, 12, 17],
  peak_days: [1, 2, 3],
  winning_hashtag_clusters: [["#trades", "#nsw"]],
  best_platform: "instagram" as const,
  avg_engagement_rate: 4.5,
  digest_count: 4,
}

const MOCK_SLOT = {
  slot_id: "slot_0",
  day_of_week: 1,
  scheduled_at: "2026-04-06T09:00:00.000Z",
  platform: "instagram" as const,
  content_type: "educational" as const,
  hashtag_set: ["#trades"],
  topic_hint: "educational content",
  based_on_content_type: "educational",
}

describe("Auto-Calendar Pipeline Smoke Test", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key"
    process.env.ANTHROPIC_API_KEY = "test-key"
    mockTrackPipelineCost.mockResolvedValue(undefined)
    mockSupabaseSingle.mockResolvedValue({ data: { id: "cal-uuid" }, error: null })
  })

  it("(a) returns a non-null calendar when sufficient digests exist", async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: MOCK_SIGNALS, digest_count: 4 })
    mockScheduleSlots.mockReturnValue(Array(7).fill(MOCK_SLOT))
    mockGenerateCaptions.mockResolvedValue({
      captions: ["Caption 1", "Caption 2", "Caption 3"],
      input_tokens: 50,
      output_tokens: 80,
    })

    const result = await generateWeeklyCalendar(TEST_CLIENT_ID, TEST_CLIENT_CONTEXT)

    expect(result.calendar).not.toBeNull()
  })

  it("(b) calendar contains a slots array", async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: MOCK_SIGNALS, digest_count: 4 })
    mockScheduleSlots.mockReturnValue(Array(7).fill(MOCK_SLOT))
    mockGenerateCaptions.mockResolvedValue({
      captions: ["Caption 1", "Caption 2", "Caption 3"],
      input_tokens: 50,
      output_tokens: 80,
    })

    const result = await generateWeeklyCalendar(TEST_CLIENT_ID, TEST_CLIENT_CONTEXT)

    expect(Array.isArray(result.calendar!.slots)).toBe(true)
  })

  it("(c) calendar_posts.length > 0", async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: MOCK_SIGNALS, digest_count: 4 })
    mockScheduleSlots.mockReturnValue(Array(7).fill(MOCK_SLOT))
    mockGenerateCaptions.mockResolvedValue({
      captions: ["Caption 1", "Caption 2", "Caption 3"],
      input_tokens: 50,
      output_tokens: 80,
    })

    const result = await generateWeeklyCalendar(TEST_CLIENT_ID, TEST_CLIENT_CONTEXT)

    expect(result.calendar!.slots.length).toBeGreaterThan(0)
  })

  it("(d) every slot has non-null, non-empty content (captions)", async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: MOCK_SIGNALS, digest_count: 4 })
    mockScheduleSlots.mockReturnValue(Array(7).fill(MOCK_SLOT))
    mockGenerateCaptions.mockResolvedValue({
      captions: ["Caption 1", "Caption 2", "Caption 3"],
      input_tokens: 50,
      output_tokens: 80,
    })

    const result = await generateWeeklyCalendar(TEST_CLIENT_ID, TEST_CLIENT_CONTEXT)

    for (const slot of result.calendar!.slots) {
      expect(slot.captions).not.toBeNull()
      expect(slot.captions.length).toBeGreaterThan(0)
      for (const caption of slot.captions) {
        expect(typeof caption).toBe("string")
        expect(caption.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("(e) every slot has a non-null ISO scheduled_at timestamp", async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: MOCK_SIGNALS, digest_count: 4 })
    mockScheduleSlots.mockReturnValue(Array(7).fill(MOCK_SLOT))
    mockGenerateCaptions.mockResolvedValue({
      captions: ["Caption 1", "Caption 2", "Caption 3"],
      input_tokens: 50,
      output_tokens: 80,
    })

    const result = await generateWeeklyCalendar(TEST_CLIENT_ID, TEST_CLIENT_CONTEXT)

    for (const slot of result.calendar!.slots) {
      expect(slot.scheduled_at).not.toBeNull()
      const parsed = new Date(slot.scheduled_at)
      expect(parsed.getTime()).not.toBeNaN()
    }
  })

  it("cold_start: returns null calendar when fewer than 3 digests — prevents empty post writes", async () => {
    mockReadDigestSignals.mockResolvedValue({ signals: null, digest_count: 2 })

    const result = await generateWeeklyCalendar(TEST_CLIENT_ID, TEST_CLIENT_CONTEXT)

    expect(result.calendar).toBeNull()
    expect(result.skipped_reason).toBe("cold_start")

    // Structural safety: a null calendar MUST have a skipped_reason explaining why.
    // A null calendar with no reason is an invisible failure.
    expect(result.skipped_reason).not.toBeNull()
  })
})
