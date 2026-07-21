// Server-side Anthropic client.
//
// This route is deliberately metered-API-only. Claude Free/Pro/Max consumer
// session credentials belong to an independently attested local Claude Code
// process and must never be transplanted into apps/web.

import Anthropic from '@anthropic-ai/sdk'

let instance: Anthropic | null = null

export function getAIClient(): Anthropic {
  if (instance) return instance

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required for the metered server route; Claude plan session credentials are not accepted',
    )
  }

  instance = new Anthropic({
    apiKey,
    // Retry policy lives in ai/router createWithRetry. Keeping the SDK retry
    // count at zero prevents multiplicative request and spend amplification.
    maxRetries: 0,
  })
  return instance
}

export function resetAIClient(): void {
  instance = null
}
