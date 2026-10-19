/**
 * Synthex witness-event mapping — pure functions, no I/O.
 *
 * Ported from apps/empire/src/lib/integrations/synthex-events.ts. Here a
 * validated Synthex event becomes ONE redacted cc_agent_events row (names and
 * targets only — the table stores no payload by design). Transport lives in
 * app/api/webhooks/synthex/route.ts.
 */

import { z } from 'zod'
import type { AgentEventInput } from '@/lib/command-centre/agent-events'

export const SYNTHEX_AGENT_NAME = 'synthex'
export const SYNTHEX_MACHINE = 'synthex.social'
const MAX_TARGET = 512

export const synthexEventSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
    source: z.literal('synthex'),
    timestamp: z.string().datetime(),
    orgSlug: z.string().trim().min(1).max(60).optional(),
    missionId: z.string().uuid().optional(),
  })
  .passthrough()

export type SynthexEvent = z.infer<typeof synthexEventSchema>

/** Synthex organization slugs → business slugs where they differ. */
const BUSINESS_SLUG_ALIASES: Record<string, string> = {
  ccw: 'ccw-crm',
  nrpg: 'dr-nrpg',
}

export function resolveBusinessSlug(orgSlug: string | undefined): string | null {
  if (!orgSlug) return null
  const slug = orgSlug.trim().toLowerCase()
  if (!slug) return null
  return BUSINESS_SLUG_ALIASES[slug] ?? slug
}

/** Strip control characters and collapse whitespace so a value stays one line. */
function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** One-line human summary. Unknown types are still witnessed, never dropped. */
export function summariseEvent(event: SynthexEvent): string {
  const brand = event.orgSlug ? ` for ${oneLine(event.orgSlug)}` : ''
  const type = oneLine(event.type)
  let summary: string
  switch (event.type) {
    case 'content.published':
      summary = `Synthex published a ${oneLine(String(event.platform ?? 'social'))} post${brand}`
      break
    case 'content.outcomes':
      summary = `Synthex weekly outcomes digest${brand}`
      break
    case 'campaign.started':
      summary = `Synthex campaign started${brand}`
      break
    case 'campaign.completed':
      summary = `Synthex campaign completed${brand}`
      break
    case 'revenue.daily':
      summary = 'Synthex daily revenue snapshot'
      break
    default:
      summary = `Synthex event: ${type}${brand}`
  }
  return summary.slice(0, MAX_TARGET)
}

/** Map a validated event to its single cc_agent_events input. */
export function toAgentEventInput(event: SynthexEvent): AgentEventInput {
  return {
    agentName: SYNTHEX_AGENT_NAME,
    // cc_agent_events.surface CHECK allows only codex|claude-code|pi-ceo-dev|local.
    surface: 'local',
    machine: SYNTHEX_MACHINE,
    projectKey: resolveBusinessSlug(event.orgSlug),
    eventType: 'status',
    toolName: oneLine(event.type).slice(0, 128),
    target: summariseEvent(event),
  }
}
