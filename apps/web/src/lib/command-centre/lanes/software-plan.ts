// src/lib/command-centre/lanes/software-plan.ts
//
// CC — Software Lane: Build Plan Generator.
//
// generateBuildPlan: calls the model once with a system prompt that asks for
// ONLY JSON { title, summary, acceptanceCriteria[], steps[] }. Parses the
// response; on ANY failure returns a deterministic fallback derived from the
// idea. Never throws to the caller — best-effort.
//
// Inject `client` for tests; production callers omit it (singleton Anthropic
// client used, matching classify-idea.ts / clarify.ts convention).

import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import type { ModelClientLike } from '@/lib/command-centre/clarify'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildPlan {
  title: string
  summary: string
  acceptanceCriteria: string[]
  steps: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_ACCEPTANCE_CRITERIA = [
  'Behaviour matches the idea',
  'Tests cover the change',
  'No regressions',
]

const FALLBACK_STEPS = ['Scope & branch', 'Implement', 'Test', 'Open PR for review']

const SOFTWARE_PLAN_SYSTEM =
  'You are a senior software engineer helping a founder turn an idea into a concrete build plan. ' +
  'Return ONLY valid JSON matching this schema exactly: ' +
  '{ "title": string, "summary": string, "acceptanceCriteria": string[], "steps": string[] }. ' +
  '"title" is a concise task title (max 80 chars). ' +
  '"summary" is one paragraph describing what will be built. ' +
  '"acceptanceCriteria" lists 2-5 testable acceptance criteria. ' +
  '"steps" lists 3-6 ordered build steps. ' +
  'No markdown, no prose outside the JSON.'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractText(content: Array<{ type: string; text?: string }>): string {
  const first = content[0]
  return first && first.type === 'text' && first.text ? first.text : ''
}

function fallback(idea: string): BuildPlan {
  return {
    title: idea.length > 120 ? idea.slice(0, 117) + '…' : idea,
    summary: idea,
    acceptanceCriteria: FALLBACK_ACCEPTANCE_CRITERIA,
    steps: FALLBACK_STEPS,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a structured build plan from a founder's idea text.
 *
 * Returns a deterministic fallback on any failure (model error, network error,
 * unparseable JSON, or missing required fields). Never throws to the caller.
 *
 * The `client` argument is injected for testing; production callers omit it
 * and the singleton Anthropic client is used (matching clarify.ts convention).
 */
export async function generateBuildPlan(
  idea: string,
  client?: ModelClientLike,
): Promise<BuildPlan> {
  try {
    const model = client ?? (getAIClient() as unknown as ModelClientLike)
    const res = await model.messages.create({
      model: ANTHROPIC_MODELS.SONNET,
      max_tokens: 1024,
      system: SOFTWARE_PLAN_SYSTEM,
      messages: [{ role: 'user', content: idea }],
    })
    const text = extractText(res.content)
    const parsed = JSON.parse(text) as {
      title?: unknown
      summary?: unknown
      acceptanceCriteria?: unknown
      steps?: unknown
    }

    // Validate required fields — fall back if any is missing or wrong type.
    const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : null
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : null
    const criteria = Array.isArray(parsed.acceptanceCriteria) ? (parsed.acceptanceCriteria as unknown[]).filter((c): c is string => typeof c === 'string') : null
    const steps = Array.isArray(parsed.steps) ? (parsed.steps as unknown[]).filter((s): s is string => typeof s === 'string') : null

    if (!title || !summary || !criteria || criteria.length === 0 || !steps || steps.length === 0) {
      return fallback(idea)
    }

    return { title, summary, acceptanceCriteria: criteria, steps }
  } catch {
    return fallback(idea)
  }
}
