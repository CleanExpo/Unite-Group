/**
 * POST /api/bots/lead-chat — the lead follow-up demo bot on /bots (UNI-3217, epic UNI-3214)
 *
 * PUBLIC ROUTE (exact path in EXACT_PUBLIC_FILES, src/proxy.ts). A visitor on /bots has no account and no site key, so
 * this is a documented exception to "auth on every route", like /api/leads. What stands in for auth:
 * - a per-IP burst limit in this route (src/lib/bots/rate-limit.ts) on top of the middleware's 30/min per IP,
 * - a cap on messages per chat and characters per message, and a hard max_tokens per reply,
 * - the durable daily ceiling + kill switch shared with the public site agent (claim_public_agent_quota,
 *   UNI-2917), checked BEFORE any model call and failing closed. While the founder's public agent switch is
 *   off, this route answers 503 with fallback "form" and the page shows a plain contact form instead.
 *
 * The route only runs the model turn. It never writes the lead: when the bot has the visitor's details it
 * returns them as `capture`, and the page shows them back with a consent box before posting to the existing
 * /api/leads. The model key is the existing server-only ANTHROPIC_API_KEY (via getAIClient).
 * No model prose reaches the visitor (src/lib/bots/guard.ts): the model only returns JSON about what the visitor
 * typed, the reply is always one of the fixed REPLY_TEMPLATES, and every captured detail must be the visitor's own
 * words, found verbatim in their messages.
 */

import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'

import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import { recordAiUsage } from '@/lib/ai/usage-recorder'
import { BOT_LIMITS, buildLeadBotSystemPrompt, nextReply, readModelOutput, visitorDetails } from '@/lib/bots/guard'
import { clientIp, isRateLimited } from '@/lib/bots/rate-limit'
import { claimPublicAgentQuota, quotaRefusalResponse } from '@/lib/site-agent/quota'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MODEL = ANTHROPIC_MODELS.HAIKU
/** The quota scope for this demo: one shared daily budget for every visitor of /bots. */
const QUOTA_SCOPE = 'bots:lead-follow-up'

const UNAVAILABLE = { error: 'The demo bot is not available right now. You can send your details with the form instead.', fallback: 'form' } as const

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Parsed = { ok: true; messages: ChatMessage[] } | { ok: false; error: string }

function parseBody(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Body must be a JSON object' }
  const list = (raw as { messages?: unknown }).messages
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: 'messages must be a non-empty array' }
  if (list.length > BOT_LIMITS.maxMessages) return { ok: false, error: 'This demo chat has reached its limit. Please use the form instead.' }
  const messages: ChatMessage[] = []
  for (const entry of list) {
    const m = entry as { role?: unknown; content?: unknown } | null
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return { ok: false, error: 'message role must be "user" or "assistant"' }
    if (typeof m.content !== 'string' || !m.content.trim()) return { ok: false, error: 'message content must be a non-empty string' }
    if (m.content.length > BOT_LIMITS.maxMessageChars) {
      return { ok: false, error: `Please keep each message under ${BOT_LIMITS.maxMessageChars} characters.` }
    }
    messages.push({ role: m.role, content: m.content })
  }
  if (messages[messages.length - 1].role !== 'user') return { ok: false, error: 'the last message must be from the visitor' }
  // Anthropic needs the first turn to be the visitor's. The page opens with a bot greeting, which is dropped here.
  return { ok: true, messages: messages.slice(messages.findIndex((m) => m.role === 'user')) }
}

function transcriptFor(messages: ChatMessage[]): string {
  const lines = messages.map((m) => `${m.role === 'user' ? 'Visitor' : 'Bot'}: ${m.content}`)
  return `The chat so far:\n\n${lines.join('\n')}\n\nReturn the JSON object only.`
}

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = parseBody(raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: 'Too many messages. Please wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    console.error('[bots/lead-chat] FOUNDER_USER_ID not configured')
    return NextResponse.json(UNAVAILABLE, { status: 503 })
  }

  let client: Anthropic
  try {
    client = getAIClient()
  } catch {
    return NextResponse.json(UNAVAILABLE, { status: 503 })
  }

  // Durable daily ceiling + kill switch, before any model call. Fails closed, including when the
  // service client cannot be built (createServiceClient throws on a missing or placeholder key).
  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch {
    console.error('[bots/lead-chat] service client unavailable')
    return NextResponse.json(UNAVAILABLE, { status: 503 })
  }
  const quota = await claimPublicAgentQuota(supabase, founderId, QUOTA_SCOPE, 'chat')
  if (!quota.ok) {
    console.warn(`[bots/lead-chat] quota refused: ${quota.reason}`)
    const refusal = quotaRefusalResponse(quota.reason)
    return NextResponse.json(UNAVAILABLE, {
      status: refusal.status,
      headers: { 'Retry-After': String(refusal.retryAfterSeconds) },
    })
  }

  const startedAt = Date.now()
  let message: Anthropic.Message
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: BOT_LIMITS.maxOutputTokens,
      system: buildLeadBotSystemPrompt(),
      // The model reads the chat as a transcript and returns JSON; it is not playing the bot.
      messages: [{ role: 'user', content: transcriptFor(parsed.messages) }],
    })
  } catch {
    // Never pass provider internals to a public caller.
    return NextResponse.json({ error: 'The demo bot could not answer just now. Please try again.' }, { status: 502 })
  }

  // Fail-soft by design: the one existing recorder (ai_usage_logs), no second metering store.
  await recordAiUsage({
    taskType: 'bots-lead-follow-up',
    model: MODEL,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
    requestId: message.id ?? null,
    latencyMs: Date.now() - startedAt,
    success: true,
    metadata: { surface: 'api/bots/lead-chat' },
  })

  const rawText = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  const read = readModelOutput(rawText)
  if (!read) console.warn('[bots/lead-chat] model output was not the expected JSON')
  const visitorMessages = parsed.messages.filter((m) => m.role === 'user').map((m) => m.content)
  const { reply, capture } = nextReply(read, visitorDetails(read, visitorMessages))

  const visitorTurns = visitorMessages.length
  const turnsLeft = Math.max(0, Math.floor(BOT_LIMITS.maxMessages / 2) - visitorTurns)

  return NextResponse.json({ reply, capture, turnsLeft }, { status: 200 })
}
