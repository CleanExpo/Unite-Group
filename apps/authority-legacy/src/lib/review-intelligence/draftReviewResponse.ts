/**
 * Review Intelligence — Draft GBP Review Response
 * SYN-590 stub: structural contract for the review response pipeline.
 *
 * Full implementation: Sprint 4 (after RBAC in SYN-583).
 * This stub exists so CI smoke tests can validate the output shape immediately.
 */

export interface GbpReview {
  review_id: string
  client_id: string
  reviewer_name: string
  rating: number // 1–5
  review_text: string
  review_date: string // ISO date
}

export interface ReviewDraftResult {
  review_id: string
  client_id: string
  draft_response: string
  sentiment: "positive" | "neutral" | "negative"
  cost_usd: number
  generated_at: string
}

/**
 * Generates a draft GBP review response for the given review.
 *
 * Stub: returns a structurally valid response using template logic.
 * Replace with Claude Haiku call in Sprint 4 RBAC implementation.
 */
export async function draftReviewResponse(
  review: GbpReview,
  brandVoice: string = "professional"
): Promise<ReviewDraftResult> {
  const sentiment: ReviewDraftResult["sentiment"] =
    review.rating >= 4 ? "positive" : review.rating === 3 ? "neutral" : "negative"

  const templates: Record<ReviewDraftResult["sentiment"], string> = {
    positive: `Thank you so much, ${review.reviewer_name}! We're thrilled to hear you had a great experience. Your kind words mean a lot to our team and motivate us to keep delivering excellent service.`,
    neutral: `Thank you for your feedback, ${review.reviewer_name}. We appreciate you taking the time to share your experience. We'd love to learn more about how we can do better — please don't hesitate to reach out.`,
    negative: `We're sorry to hear about your experience, ${review.reviewer_name}. This isn't the standard we hold ourselves to, and we'd like to make it right. Please contact us directly so we can address your concerns.`,
  }

  return {
    review_id: review.review_id,
    client_id: review.client_id,
    draft_response: templates[sentiment],
    sentiment,
    cost_usd: 0, // stub — real implementation will track Claude API cost
    generated_at: new Date().toISOString(),
  }
}
