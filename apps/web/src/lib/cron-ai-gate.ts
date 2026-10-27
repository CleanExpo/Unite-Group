// src/lib/cron-ai-gate.ts
// Off-switch for every cron route that calls a paid model API (Anthropic,
// Gemini, ...) through an API key. Founder rule, 27/10/2026: "NO API KEYS".
//
// Vercel turns all crons on or off together, so the crons can be re-enabled
// while this switch keeps the model-calling ones inert. Default OFF: a gated
// route does nothing unless CRON_AI_ENABLED is exactly the string 'true'.
// No trimming and no case folding, so ' true ', 'TRUE' and '1' all stay off.
//
// Usage, directly AFTER the CRON_SECRET check and before any other work:
//   const aiOff = cronAiDisabledResponse()
//   if (aiOff) return aiOff

import { NextResponse } from 'next/server'

export const CRON_AI_SKIPPED_REASON = 'CRON_AI_ENABLED is not true'

/** True only when CRON_AI_ENABLED is exactly 'true'. Read at call time. */
export function isCronAiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CRON_AI_ENABLED === 'true'
}

/**
 * Null when model-calling crons are enabled. Otherwise a 200 response saying
 * the run was skipped, for the route to return before any model call or any
 * write that feeds one.
 */
export function cronAiDisabledResponse(env: NodeJS.ProcessEnv = process.env): NextResponse | null {
  if (isCronAiEnabled(env)) return null
  return NextResponse.json({ skipped: CRON_AI_SKIPPED_REASON }, { status: 200 })
}
