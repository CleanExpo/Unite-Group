// src/lib/command-centre/classify-idea.ts
//
// CC — Idea Classifier + Routing Decision builder.
//
// toRoutingDecision: pure validator — checks lane/confidence/rationale and attaches
// the chosen lane's plans, falling back to 'unknown' with empty plans on any invalid input.
//
// classifyIdea: best-effort async caller — sends the idea to the model and returns a
// RoutingDecision. Returns an 'unknown' RoutingDecision on any model or parse failure —
// never throws by default. Strict delivery callers retain sanitised failure details.

import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import type { JSONOutputFormat } from '@anthropic-ai/sdk/resources/messages'
import type { ModelClientLike } from './clarify'
import { preparationFailure } from './preparation-failure'
import { PreparationResponseError, readPreparationObject } from './model-response'
import { type Lane, type RoutingDecision, type IdeaContext, getLaneAdapter } from './lanes'

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID: Lane[] = ['marketing', 'software', 'content']

const CLASSIFY_SYSTEM =
  'Classify a founder idea into exactly one lane: "marketing" (campaigns/content/social), ' +
  '"software" (features/code/APIs), or "content" (articles/guides/knowledge). Return ONLY JSON: ' +
  '{"lane": "...", "confidence": 0..1, "rationale": "one sentence"}. No markdown.'

const CLASSIFY_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      lane: { type: 'string', enum: VALID },
      confidence: { type: 'number', description: 'A finite confidence from 0 to 1 inclusive.' },
      rationale: { type: 'string', description: 'One non-empty sentence explaining the classification.' },
    },
    required: ['lane', 'confidence', 'rationale'],
    additionalProperties: false,
  },
} satisfies JSONOutputFormat

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractText(content: Array<{ type: string; text?: string }>): string {
  const first = content[0]
  return first && first.type === 'text' && first.text ? first.text : ''
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pure validator: takes raw model output values and returns a valid RoutingDecision.
 *
 * Validation rules:
 * - Invalid lane string → 'unknown' with empty plans
 * - Confidence outside 0..1 → clamped to 0
 * - Empty/missing rationale → default sentence
 * - getLaneAdapter('unknown') returns null → always empty plans for unknown lane
 */
export function toRoutingDecision(
  modelLane: unknown,
  modelConfidence: unknown,
  modelRationale: unknown,
  ctx: IdeaContext,
): RoutingDecision {
  const lane = (VALID as string[]).includes(modelLane as string) ? (modelLane as Lane) : 'unknown'
  const confidence =
    typeof modelConfidence === 'number' && modelConfidence >= 0 && modelConfidence <= 1
      ? modelConfidence
      : 0
  const rationale =
    typeof modelRationale === 'string' && modelRationale.trim()
      ? modelRationale.trim()
      : 'No rationale provided.'
  const adapter = getLaneAdapter(lane)
  return {
    lane: adapter ? lane : 'unknown',
    confidence: adapter ? confidence : 0,
    rationale,
    planBuild: adapter ? adapter.planBuild(ctx) : [],
    planDistribute: adapter ? adapter.planDistribute(ctx) : [],
  }
}

/**
 * Calls the model to classify a founder idea into a routing decision.
 *
 * Returns an 'unknown' RoutingDecision with empty plans on any failure (model error,
 * network error, unparseable JSON). Never throws to the caller — classification is
 * advisory and must not block the pipeline. Strict delivery mode instead throws a
 * sanitised preparation failure so the saved mission can show a useful recovery.
 *
 * The `client` argument is injected for testing; production callers omit it and the
 * singleton Anthropic client is used (matching clarify.ts convention).
 */
export async function classifyIdea(
  ctx: IdeaContext,
  client?: ModelClientLike,
  options?: { strict?: boolean },
): Promise<RoutingDecision> {
  try {
    const model = client ?? (getAIClient() as unknown as ModelClientLike)
    const userContent = JSON.stringify({ idea: ctx.idea, clarifications: ctx.clarifications })
    const res = await model.messages.create({
      model: ANTHROPIC_MODELS.HAIKU,
      max_tokens: 300,
      system: CLASSIFY_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
      ...(options?.strict ? { output_config: { format: CLASSIFY_FORMAT } } : {}),
    })
    const parsed = (options?.strict ? readPreparationObject(res, CLASSIFY_FORMAT.schema.required)
      : JSON.parse(extractText(res.content))) as {
      lane?: unknown
      confidence?: unknown
      rationale?: unknown
    }
    const lane = options?.strict && typeof parsed.lane === 'string' ? parsed.lane.trim().toLowerCase() : parsed?.lane
    if (options?.strict && (!(VALID as unknown[]).includes(lane) ||
      typeof parsed.confidence !== 'number' || !Number.isFinite(parsed.confidence) || parsed.confidence < 0 || parsed.confidence > 1 ||
      typeof parsed.rationale !== 'string' || !parsed.rationale.trim())) {
      throw new PreparationResponseError('invalid_values')
    }
    const routing = toRoutingDecision(lane, parsed?.confidence, parsed?.rationale, ctx)
    if (options?.strict && routing.lane === 'unknown') throw new PreparationResponseError('invalid_values')
    return routing
  } catch (error) {
    if (options?.strict) throw preparationFailure(error, 'classification')
    return toRoutingDecision(
      undefined,
      undefined,
      'Could not classify the idea automatically — choose a lane manually.',
      ctx,
    )
  }
}
