// src/lib/command-centre/margot-health.ts
//
// Mission Control "Margot Operational State" — the FIRST health surface for the
// Margot voice operator. There is no existing Margot health tile; this derives
// one from cheaply-readable truth:
//   - config presence booleans (mirrors the 503 logic in the signed-url route)
//   - the most recent margot_voice_sessions row (founder-scoped)
//   - the most recent operator_agent_presence heartbeat (founder-scoped)
//
// NorthStar "no fake-as-real": every degradable read carries a `source`
// discriminator. Booleans and timestamps only — this surface NEVER touches key
// material. Pure + dependency-injected so the derivation is unit-tested without
// Supabase or secrets.

export interface MargotConfigPresence {
  /** ELEVENLABS_API_KEY present (boolean only — never the value). */
  elevenLabsApiKey: boolean
  /** ELEVENLABS_MARGOT_AGENT_ID present. */
  margotAgentId: boolean
  /** ELEVENLABS_INGEST_TOKEN present (the voice-packet ingest lane). */
  ingestToken: boolean
  /** FOUNDER_USER_ID present (ingest writes are scoped to it). */
  founderConfigured: boolean
  /**
   * MISSION_PROVENANCE_SECRET present — the HMAC key that signs a voice mission
   * so the lane gate can prove the bridge produced it.
   *
   * Surfaced because its absence is silent in the worst way: packets still
   * authenticate and still persist as transcripts, but every mission is refused
   * as `provenance_secret_unset` and none is ever created. Without this flag the
   * founder sees voice sessions arriving and no missions appearing, with nothing
   * on the health surface explaining why. Boolean only — never the value.
   */
  provenanceKeyConfigured: boolean
}

export type MargotReadSource = 'live' | 'error'

export interface MargotVoiceRead {
  ok: boolean
  latestSessionAt: string | null
  sessionsInWindow: number
  error?: string
}

export interface MargotPresenceRead {
  ok: boolean
  latestSeenAt: string | null
  agentCount: number
  error?: string
}

export interface MargotHealthInput {
  now: string
  windowDays: number
  config: MargotConfigPresence
  voice: MargotVoiceRead
  presence: MargotPresenceRead
}

export interface MargotHealthPayload {
  source: 'cc:margot-health'
  generatedAt: string
  windowDays: number
  /** True when the signed-url route would succeed (both API key + agent id set). */
  voiceReady: boolean
  /**
   * True when a spoken mission can actually become governed work: the ingest
   * lane is configured AND the provenance key is present. voiceReady only
   * covers reaching the agent, so it can be green while every mission is
   * silently refused.
   */
  missionBridgeReady: boolean
  config: MargotConfigPresence
  voice: {
    source: MargotReadSource
    latestSessionAt: string | null
    sessionsInWindow: number
    error: string | null
  }
  agents: {
    source: MargotReadSource
    latestSeenAt: string | null
    activeCount: number
    error: string | null
  }
}

/** Pure derivation of the Margot health payload from already-fetched reads. */
export function deriveMargotHealth(input: MargotHealthInput): MargotHealthPayload {
  return {
    source: 'cc:margot-health',
    generatedAt: input.now,
    windowDays: input.windowDays,
    voiceReady: input.config.elevenLabsApiKey && input.config.margotAgentId,
    missionBridgeReady:
      input.config.ingestToken &&
      input.config.founderConfigured &&
      input.config.provenanceKeyConfigured,
    config: input.config,
    voice: {
      source: input.voice.ok ? 'live' : 'error',
      latestSessionAt: input.voice.latestSessionAt,
      sessionsInWindow: input.voice.sessionsInWindow,
      error: input.voice.error ?? null,
    },
    agents: {
      source: input.presence.ok ? 'live' : 'error',
      latestSeenAt: input.presence.latestSeenAt,
      activeCount: input.presence.agentCount,
      error: input.presence.error ?? null,
    },
  }
}
