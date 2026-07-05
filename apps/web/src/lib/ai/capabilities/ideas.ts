// src/lib/ai/capabilities/ideas.ts
// Idea capture capability — qualifying conversation that turns raw ideas into Linear issues

import { buildSystemPrompt } from '@/lib/ideas/conversation'
import { createCapability } from '../types'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'

export const ideasCapability = createCapability({
  id: 'ideas',
  model: ANTHROPIC_MODELS.SONNET,
  maxTokens: 1024,
  systemPrompt: () => buildSystemPrompt(),
})
