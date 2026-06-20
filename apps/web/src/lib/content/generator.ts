// src/lib/content/generator.ts
// AI content generator — produces social posts, blog intros, video scripts, etc.
// Routes through the centralised AI router with structured output (tool_use).

import { execute, registerCapability } from '@/lib/ai'
import { contentGenerateCapability } from '@/lib/ai/capabilities/content-generate'
import { buildSocialPostSystemPrompt, buildSocialPostUserMessage } from './prompts/social-post'
import { ContentGenerateOutputSchema } from './schemas'
import { scorePOET, checkSurvivalFactors } from './quality-gate'
import type { POETScore, SurvivalCheck, ContentQualityInput } from './quality-gate'
import type {
  BrandIdentity,
  ContentGenerationRequest,
  ContentGenerationResult,
} from './types'
import type { z } from 'zod'

// Ensure capability is registered before first execute call (idempotent)
registerCapability(contentGenerateCapability)

type ContentGenerateOutput = z.infer<typeof ContentGenerateOutputSchema>

// ── Extended result type (additive — does not break existing callers) ─────────

export interface ContentGenerationResultWithQuality extends ContentGenerationResult {
  qualityGate?: {
    poet: POETScore
    survival: SurvivalCheck
  }
}

// ── Main generator function ──────────────────────────────────────────────────

/**
 * Generate content variants using Claude AI via the router.
 * Returns an array of validated content results.
 *
 * @param request - What to generate (businessKey, contentType, platform, topic, character, count)
 * @param brandIdentity - The brand identity for the target business
 * @param options.includeQualityGate - When true, runs the POET quality gate on each result
 *   and returns scores alongside the content. Generation is never blocked — failures are
 *   logged as warnings so a human can review before publishing.
 * @throws Error if AI response cannot be parsed or validated
 */
export async function generateContent(
  request: ContentGenerationRequest,
  brandIdentity: BrandIdentity,
  options?: { includeQualityGate?: boolean }
): Promise<ContentGenerationResultWithQuality[]> {
  const count = request.count ?? 3
  const characterPref = request.characterPreference ?? 'none'

  // System prompt is built from call-time data — passed as override to the router
  const systemPrompt = buildSocialPostSystemPrompt(
    brandIdentity,
    request.platform,
    characterPref
  )
  const userMessage = buildSocialPostUserMessage(
    request.topic,
    count,
    request.platform
  )

  const response = await execute('content-generate', {
    systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    context: { userId: '', businessKey: request.businessKey },
  })

  const { items } = response.structuredData as ContentGenerateOutput

  const results: ContentGenerationResultWithQuality[] = items.map((item) => ({
    title: item.title,
    body: item.body,
    hashtags: item.hashtags,
    cta: item.cta,
    mediaPrompt: item.mediaPrompt,
    characterUsed:
      characterPref === 'none' ? null : characterPref === 'male' ? 'male' : 'female',
    platform: request.platform ?? null,
  }))

  // ── Quality gate (non-blocking) ──────────────────────────────────────────
  // Runs POET scoring and Google-survival check on each generated piece.
  // A failing score logs a warning — it does NOT suppress the content.
  // Callers that pass includeQualityGate: true receive the scores on each result.
  if (options?.includeQualityGate) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      // Combine title + body for a fuller content signal
      const fullContent = [result.title, result.body, result.cta].filter(Boolean).join('\n')

      const [poet, survival] = await Promise.all([
        scorePOET({
          content: fullContent,
          // request.contentType is ContentType which is a strict subset of ContentQualityInput.contentType
          contentType: (request.contentType ?? 'social_post') as ContentQualityInput['contentType'],
          topic: request.topic ?? '',
          targetAudience: brandIdentity.targetAudience,
        }),
        Promise.resolve(checkSurvivalFactors(fullContent)),
      ])

      // Attach scores to the result for the caller
      result.qualityGate = { poet, survival }

      // Warn when content does not meet the quality threshold
      if (!poet.pass || !survival.pass) {
        const variantLabel = `variant ${i + 1}/${results.length} — "${result.title}"`
        const warnings: string[] = []

        if (!poet.pass) {
          warnings.push(
            `POET score ${poet.total}/100 (threshold 65). Reasons: ${poet.failReasons.join(' | ')}`
          )
        }
        if (!survival.pass) {
          warnings.push(
            `Google survival check failed. Issues: ${survival.issues.join(' | ')}`
          )
        }

        console.warn(
          `[content-quality-gate] Low-quality content detected for ${variantLabel}.\n` +
            warnings.map((w) => `  · ${w}`).join('\n') +
            '\n  Content has been generated but should be reviewed before publishing.'
        )
      }
    }
  }

  return results
}
