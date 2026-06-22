// Work intent classifier — routes plain-English descriptions to the correct
// portfolio system (RestoreAssist | Synthex | Nexus) and work type (bug | feature | infra).
// Uses Claude Haiku: fast and cost-effective for classification tasks.

import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'

export type WorkSystem = 'RestoreAssist' | 'Synthex' | 'Nexus'
export type WorkType = 'bug' | 'feature' | 'infra'

export interface WorkIntent {
  system: WorkSystem
  workType: WorkType
}

export interface ClassifyWorkResult {
  intent: WorkIntent
  confidence: number
  suggestedTitle: string
}

const CLASSIFIER_SYSTEM_PROMPT = `You are a work classifier for a founder's software portfolio. Given a plain-English description of work, classify it by target system and work type.

Systems:
- RestoreAssist: disaster recovery, backup management, restoration workflows, client DR plans, site resilience
- Synthex: social media automation, post scheduling, content publishing, platform API integrations (Instagram, YouTube, TikTok, LinkedIn, Reddit)
- Nexus: the core mission-control platform — CRM, analytics, team management, billing, user auth, command centre, dashboards, email/campaigns, bookkeeper, strategy tools

Work types:
- bug: something is broken, throwing errors, not working as expected, incorrect or missing behaviour
- feature: new capability, enhancement, or addition to existing functionality
- infra: infrastructure, performance, configuration, deployment, database, scaling, DevOps, CI/CD

Respond ONLY with a valid JSON object — no markdown fences, no explanation:
{
  "system": "<RestoreAssist|Synthex|Nexus>",
  "workType": "<bug|feature|infra>",
  "confidence": <0.0-1.0 float>,
  "suggestedTitle": "<concise action-oriented title, max 80 chars>"
}`

export async function classifyWork(
  description: string,
  context?: string,
): Promise<ClassifyWorkResult> {
  const client = getAIClient()

  const userContent = context
    ? `Work description: ${description}\n\nAdditional context: ${context}`
    : `Work description: ${description}`

  const response = await client.messages.create({
    model: ANTHROPIC_MODELS.HAIKU,
    max_tokens: 256,
    system: CLASSIFIER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''

  let parsed: { system: WorkSystem; workType: WorkType; confidence: number; suggestedTitle: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Classifier returned non-JSON response: ${raw.slice(0, 200)}`)
  }

  const validSystems: WorkSystem[] = ['RestoreAssist', 'Synthex', 'Nexus']
  const validTypes: WorkType[] = ['bug', 'feature', 'infra']

  if (!validSystems.includes(parsed.system)) {
    throw new Error(`Invalid system in classifier response: ${parsed.system}`)
  }
  if (!validTypes.includes(parsed.workType)) {
    throw new Error(`Invalid workType in classifier response: ${parsed.workType}`)
  }

  return {
    intent: {
      system: parsed.system,
      workType: parsed.workType,
    },
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    suggestedTitle: String(parsed.suggestedTitle ?? '').slice(0, 80),
  }
}
