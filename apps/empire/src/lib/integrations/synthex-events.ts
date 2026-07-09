/**
 * Synthex witness-event mapping — Flywheel container C2.
 *
 * Pure functions only (no I/O): validate an inbound Synthex event and map it
 * to an `agent_actions` insert so the /empire activity feed witnesses every
 * distribution action. Transport lives in app/api/events/route.ts; the sender
 * is Synthex `lib/unite-group-connector.ts` (fire-and-forget, x-api-key).
 */

import { z } from 'zod';

/** Known event types get first-class labels; unknown types are still
 *  witnessed (never drop a fact), just less prettily. */
export const KNOWN_EVENT_TYPES = [
  'content.published',
  'content.outcomes',
  'campaign.started',
  'campaign.completed',
  'revenue.daily',
  'user.signup',
  'user.upgrade',
  'user.churn',
  'payment.received',
] as const;

export const synthexEventSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
    source: z.literal('synthex'),
    timestamp: z.string().datetime(),
    orgSlug: z.string().trim().min(1).max(60).optional(),
  })
  .passthrough();

export type SynthexEvent = z.infer<typeof synthexEventSchema>;

/** Synthex organization slugs → Empire `businesses.slug` where they differ. */
const BUSINESS_SLUG_ALIASES: Record<string, string> = {
  ccw: 'ccw-crm',
  nrpg: 'dr-nrpg',
};

export function resolveBusinessSlug(orgSlug: string | undefined): string | null {
  if (!orgSlug) return null;
  const slug = orgSlug.trim().toLowerCase();
  if (!slug) return null;
  return BUSINESS_SLUG_ALIASES[slug] ?? slug;
}

export interface AgentActionInsert {
  source: 'synthex';
  action_type: string;
  payload: Record<string, unknown>;
  idea_text: string;
  business_id: string | null;
  status: 'done';
  resolved_at: string;
}

/** One-line human summary for the /empire activity feed. */
export function summariseEvent(event: SynthexEvent): string {
  const brand = event.orgSlug ? ` for ${event.orgSlug}` : '';
  switch (event.type) {
    case 'content.published':
      return `Synthex published a ${String(event.platform ?? 'social')} post${brand}`;
    case 'content.outcomes':
      return `Synthex weekly outcomes digest${brand}`;
    case 'campaign.started':
      return `Synthex campaign started${brand}`;
    case 'campaign.completed':
      return `Synthex campaign completed${brand}`;
    case 'revenue.daily':
      return 'Synthex daily revenue snapshot';
    default:
      return `Synthex event: ${event.type}${brand}`;
  }
}

/**
 * Map a validated event to its `agent_actions` row. Witness events record
 * facts that already happened, so they land as status='done' with
 * resolved_at set to the event timestamp.
 */
export function toAgentActionInsert(
  event: SynthexEvent,
  businessId: string | null
): AgentActionInsert {
  return {
    source: 'synthex',
    action_type: event.type,
    payload: event as Record<string, unknown>,
    idea_text: summariseEvent(event),
    business_id: businessId,
    status: 'done',
    resolved_at: event.timestamp,
  };
}
