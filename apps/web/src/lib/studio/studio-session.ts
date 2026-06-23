// src/lib/studio/studio-session.ts
//
// The Visual Campaign Studio session, persisted to cc_tasks.metadata.studio.
// `applyConceptTurn` is a pure reducer: given the prior session and one concept
// round, it returns the next session. A concept round regenerates the concept
// set, so `concepts` is replaced (not appended); the chat thread grows.

import type { StudioProvider } from './generate-visuals'

export interface ConceptImage {
  id: string
  url: string
  prompt: string
}

export interface StudioMessage {
  role: 'founder' | 'agent'
  text: string
  at: string
}

export interface StudioSession {
  phase: 'concept' | 'platform'
  provider: StudioProvider
  messages: StudioMessage[]
  concepts: ConceptImage[]
  chosenConceptId: string | null
}

export function applyConceptTurn(
  prev: Partial<StudioSession> | undefined,
  input: {
    founderMessage: string
    agentMessage: string
    newConcepts: ConceptImage[]
    provider: StudioProvider
    at: string
  },
): StudioSession {
  const messages: StudioMessage[] = [...(prev?.messages ?? [])]
  messages.push({ role: 'founder', text: input.founderMessage, at: input.at })
  messages.push({ role: 'agent', text: input.agentMessage, at: input.at })

  return {
    phase: 'concept',
    provider: input.provider,
    messages,
    concepts: input.newConcepts,
    chosenConceptId: prev?.chosenConceptId ?? null,
  }
}
