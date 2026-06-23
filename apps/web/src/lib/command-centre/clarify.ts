// src/lib/command-centre/clarify.ts
//
// CC — Clarifying Questions generator.
//
// Produces 3-4 clarifying questions for a one-line founder idea.
// Best-effort: any model or parse failure returns [], never throws to the caller.
//
// The model client is injected (default = getAIClient) so unit tests can mock
// it with zero live calls — matching the pattern in board-review.ts.

import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ModelClientLike {
  messages: { create(args: unknown): Promise<{ content: Array<{ type: string; text?: string }> }> }
}

// ─── System prompt ────────────────────────────────────────────────────────────

const CLARIFY_SYSTEM =
  'You help a founder sharpen a one-line idea. Return ONLY a JSON array of 3-4 short clarifying ' +
  'questions (each ending in "?") covering finish line, audience, constraints, out-of-scope, and ' +
  'existing assets. No prose, no markdown — just the JSON array.'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Filter an array of strings down to genuine questions:
 * trims whitespace, keeps only entries ending in "?", caps at 4.
 */
export function filterQuestions(raw: string[]): string[] {
  return raw
    .map((q) => (typeof q === 'string' ? q.trim() : ''))
    .filter((q) => q.endsWith('?'))
    .slice(0, 4)
}

function extractText(content: Array<{ type: string; text?: string }>): string {
  const first = content[0]
  return first && first.type === 'text' && first.text ? first.text : ''
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call the model to produce 3-4 clarifying questions for a one-line idea.
 *
 * Returns `[]` on any failure (model error, network error, unparseable output).
 * Never throws to the caller — clarify is advisory and must not block the pipeline.
 *
 * The `client` argument is injected for testing; production callers omit it and
 * the singleton Anthropic client is used (matching board-review.ts convention).
 */
export async function generateClarifyingQuestions(
  idea: string,
  client?: ModelClientLike,
): Promise<string[]> {
  try {
    const model = client ?? (getAIClient() as unknown as ModelClientLike)
    const res = await model.messages.create({
      model: ANTHROPIC_MODELS.HAIKU,
      max_tokens: 400,
      system: CLARIFY_SYSTEM,
      messages: [{ role: 'user', content: idea }],
    })
    const parsed = JSON.parse(extractText(res.content)) as unknown
    if (!Array.isArray(parsed)) return []
    return filterQuestions(parsed as string[])
  } catch {
    return [] // best-effort: clarify never blocks the pipeline
  }
}
