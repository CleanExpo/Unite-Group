/**
 * Site-chat transcript persistence (UNI-2920).
 *
 * Records each completed public site-chat exchange (visitor message + assistant
 * reply) on the CRM activity timeline via the EXISTING builders in
 * `@/lib/crm/activity-timeline` → `agent_actions`. No new table.
 *
 * Shape: one row per completed exchange, linked by `subjectId = conversationId`.
 * The builders hard-code `parent_id: null`, so parent-linking is not available
 * without bypassing them, and one-row-per-conversation would need an upsert key
 * the table does not have.
 *
 * Duplicate safety: the row `id` (agent_actions PRIMARY KEY) is derived
 * deterministically from the validated scope plus the REQUEST identity
 * (conversationId + the exact messages array sent). A client retry of the same
 * request derives the same id and the insert is rejected with 23505 by the
 * database itself — atomic, no check-then-insert race. The assistant reply is
 * deliberately NOT part of the key, so a retry that got a different completion
 * still collides.
 *
 * Dark by default: only `SITE_AGENT_TRANSCRIPTS_ENABLED === 'true'` writes.
 * Never throws; logs a reason code only — never message content or ids.
 */

import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCrmActivityTimelineEvent,
  buildCrmTimelineAgentActionInsert,
} from '@/lib/crm/activity-timeline'

const CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/
const MAX_STORED_CHARS = 4000
const WRITE_TIMEOUT_MS = 3000

// Mirrors sanitizeMetadata's value patterns in activity-timeline.ts: a string
// matching these is dropped wholesale by the builder, so we flag it as redacted
// rather than letting an absent value read as "nothing was said".
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_PATTERN = /(?:\+?\d[\d ().-]{7,}\d)/

export type TranscriptOutcome =
  | 'disabled'
  | 'skipped_invalid_conversation_id'
  | 'skipped_empty_reply'
  | 'persisted'
  | 'duplicate'
  | 'not_connected'
  | 'insert_failed'
  | 'timeout'
  | 'error'

export function isTranscriptsEnabled(): boolean {
  return process.env.SITE_AGENT_TRANSCRIPTS_ENABLED === 'true'
}

export function isValidConversationId(value: unknown): value is string {
  return typeof value === 'string' && CONVERSATION_ID_PATTERN.test(value)
}

/** Reads conversationId off a request body; null when absent or invalid. */
export function readConversationId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = (raw as { conversationId?: unknown }).conversationId
  return isValidConversationId(value) ? value : null
}

export function deriveExchangeId(
  founderId: string,
  businessKey: string,
  conversationId: string,
  messages: ReadonlyArray<{ role: string; content: string }>,
): string {
  const hex = createHash('sha256')
    .update(JSON.stringify([founderId, businessKey, conversationId, messages]))
    .digest('hex')
  // Format as a UUID (version nibble 5, RFC 4122 variant) for the uuid PK.
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function isMissingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  const message = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err ?? '')
  return code === '42P01' || /does not exist|could not find the table|schema cache/i.test(message)
}

function looksRedacted(value: string): boolean {
  return EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value)
}

export interface SiteChatExchange {
  founderId: string
  businessKey: string
  conversationId: string | null
  messages: ReadonlyArray<{ role: string; content: string }>
  visitorMessage: string
  assistantReply: string
}

async function insertExchange(supabase: SupabaseClient, exchange: SiteChatExchange & { conversationId: string }): Promise<TranscriptOutcome> {
  const visitorMessage = exchange.visitorMessage.slice(0, MAX_STORED_CHARS)
  const assistantReply = exchange.assistantReply.slice(0, MAX_STORED_CHARS)
  const event = buildCrmActivityTimelineEvent({
    type: 'site_chat_exchange',
    actor: 'site_visitor',
    subjectId: exchange.conversationId,
    subjectLabel: `Site chat ${exchange.conversationId.slice(0, 8)}`,
    occurredAt: new Date().toISOString(),
    source: 'api/agent',
    businessSlug: exchange.businessKey,
    metadata: {
      conversationId: exchange.conversationId,
      visitorMessage,
      assistantReply,
      visitorMessageRedacted: looksRedacted(visitorMessage),
      assistantReplyRedacted: looksRedacted(assistantReply),
    },
  })
  const id = deriveExchangeId(exchange.founderId, exchange.businessKey, exchange.conversationId, exchange.messages)
  const { error } = await supabase.from('agent_actions').insert({ id, ...buildCrmTimelineAgentActionInsert(event) })
  if (!error) return 'persisted'
  if ((error as { code?: string }).code === '23505') return 'duplicate'
  if (isMissingRelation(error)) return 'not_connected'
  return 'insert_failed'
}

/**
 * Record one completed exchange. Never throws; resolves to an outcome code
 * within WRITE_TIMEOUT_MS so a hung insert cannot hold the visitor's stream.
 */
export async function recordSiteChatExchange(
  supabase: SupabaseClient,
  exchange: SiteChatExchange,
): Promise<TranscriptOutcome> {
  let outcome: TranscriptOutcome
  if (!isTranscriptsEnabled()) return 'disabled'
  if (!exchange.conversationId) {
    outcome = 'skipped_invalid_conversation_id'
  } else if (!exchange.assistantReply.trim()) {
    outcome = 'skipped_empty_reply'
  } else {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      outcome = await Promise.race([
        insertExchange(supabase, { ...exchange, conversationId: exchange.conversationId }),
        new Promise<TranscriptOutcome>((resolve) => {
          timer = setTimeout(() => resolve('timeout'), WRITE_TIMEOUT_MS)
        }),
      ])
    } catch (err) {
      outcome = isMissingRelation(err) ? 'not_connected' : 'error'
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  // Reason code only — no message content, no conversation or founder ids.
  if (outcome === 'persisted' || outcome === 'duplicate') {
    console.info(`[agent] transcript ${outcome}`)
  } else {
    console.warn(`[agent] transcript ${outcome}`)
  }
  return outcome
}
