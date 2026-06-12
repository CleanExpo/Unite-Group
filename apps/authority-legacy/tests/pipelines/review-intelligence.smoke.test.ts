/**
 * Review Intelligence Pipeline — CI Smoke Test
 * SYN-590: Structural validity checks for GBP review draft generation.
 *
 * Asserts that review draft generation returns a structurally valid output:
 * - draft_response is a string with length > 20 (not empty or whitespace-only)
 *
 * Failure here means the pipeline writes empty or null review responses
 * to GBP on behalf of clients, which damages their reputation silently.
 */

import {
  draftReviewResponse,
  GbpReview,
} from "../../src/lib/review-intelligence/draftReviewResponse"

const TEST_CLIENT_ID = "smoke-test-client-trades-nsw"

const POSITIVE_REVIEW: GbpReview = {
  review_id: "rev-smoke-001",
  client_id: TEST_CLIENT_ID,
  reviewer_name: "Jane Smith",
  rating: 5,
  review_text: "Absolutely fantastic service. Highly recommend!",
  review_date: "2026-03-31",
}

const NEGATIVE_REVIEW: GbpReview = {
  review_id: "rev-smoke-002",
  client_id: TEST_CLIENT_ID,
  reviewer_name: "Bob Jones",
  rating: 1,
  review_text: "Very disappointing experience.",
  review_date: "2026-03-31",
}

const NEUTRAL_REVIEW: GbpReview = {
  review_id: "rev-smoke-003",
  client_id: TEST_CLIENT_ID,
  reviewer_name: "Alice Brown",
  rating: 3,
  review_text: "It was okay. Nothing special.",
  review_date: "2026-03-31",
}

describe("Review Intelligence Pipeline Smoke Test", () => {
  it("(a) returns a result for positive review", async () => {
    const result = await draftReviewResponse(POSITIVE_REVIEW)
    expect(result).not.toBeNull()
  })

  it("(b) result contains a draft_response field", async () => {
    const result = await draftReviewResponse(POSITIVE_REVIEW)
    expect("draft_response" in result).toBe(true)
  })

  it(
    "(c) draft_response is a string with length > 20 — not empty or whitespace-only\n" +
      "    Auto-Calendar smoke test FAILED: expected non-null content string, got null — " +
      "check review-intelligence pipeline and test client seed",
    async () => {
      const result = await draftReviewResponse(POSITIVE_REVIEW)

      expect(typeof result.draft_response).toBe("string")
      expect(result.draft_response.trim().length).toBeGreaterThan(20)
    }
  )

  it("draft_response for negative review is non-empty and empathetic", async () => {
    const result = await draftReviewResponse(NEGATIVE_REVIEW)

    expect(result.draft_response.trim().length).toBeGreaterThan(20)
    // Should reference the reviewer's name (personalisation check)
    expect(result.draft_response).toContain(NEGATIVE_REVIEW.reviewer_name)
  })

  it("draft_response for neutral review is non-empty", async () => {
    const result = await draftReviewResponse(NEUTRAL_REVIEW)
    expect(result.draft_response.trim().length).toBeGreaterThan(20)
  })

  it("result includes client_id and review_id matching input", async () => {
    const result = await draftReviewResponse(POSITIVE_REVIEW)
    expect(result.client_id).toBe(TEST_CLIENT_ID)
    expect(result.review_id).toBe(POSITIVE_REVIEW.review_id)
  })

  it("result includes generated_at as a valid ISO timestamp", async () => {
    const result = await draftReviewResponse(POSITIVE_REVIEW)
    expect(result.generated_at).not.toBeNull()
    expect(new Date(result.generated_at).getTime()).not.toBeNaN()
  })

  it("sentiment field is one of: positive | neutral | negative", async () => {
    const pos = await draftReviewResponse(POSITIVE_REVIEW)
    const neg = await draftReviewResponse(NEGATIVE_REVIEW)
    const neu = await draftReviewResponse(NEUTRAL_REVIEW)

    expect(["positive", "neutral", "negative"]).toContain(pos.sentiment)
    expect(["positive", "neutral", "negative"]).toContain(neg.sentiment)
    expect(["positive", "neutral", "negative"]).toContain(neu.sentiment)
  })
})
