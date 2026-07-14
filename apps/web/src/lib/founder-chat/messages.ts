// src/lib/founder-chat/messages.ts
// Pure helpers for the founder chat lane (/api/founder/chat + /founder/chat).
// No IO — every branch is covered by the colocated unit tests.
//
// Mirrors the body-validation idiom of the public site agent
// (src/app/api/agent/route.ts) with founder-lane limits: the founder is
// session-authenticated, so the caps are generosity-vs-cost guards, not
// abuse guards.

export interface FounderChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const MAX_MESSAGES = 40
export const MAX_CONTENT_CHARS = 8000
const MAX_BUSINESS_KEY_CHARS = 120

export type ParsedFounderChatBody =
  | { ok: true; messages: FounderChatMessage[]; businessKey: string | null }
  | { ok: false; error: string }

export function parseFounderChatBody(raw: unknown): ParsedFounderChatBody {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Body must be a JSON object' }
  }
  const body = raw as { messages?: unknown; businessKey?: unknown }

  let businessKey: string | null = null
  if (body.businessKey !== undefined && body.businessKey !== null) {
    if (typeof body.businessKey !== 'string') {
      return { ok: false, error: 'businessKey must be a string' }
    }
    const trimmed = body.businessKey.trim()
    if (trimmed.length > MAX_BUSINESS_KEY_CHARS) {
      return { ok: false, error: `businessKey must be at most ${MAX_BUSINESS_KEY_CHARS} characters` }
    }
    businessKey = trimmed.length > 0 ? trimmed : null
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array' }
  }
  if (body.messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages must contain at most ${MAX_MESSAGES} entries` }
  }

  const messages: FounderChatMessage[] = []
  for (const entry of body.messages) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'each message must be an object' }
    }
    const message = entry as { role?: unknown; content?: unknown }
    if (message.role !== 'user' && message.role !== 'assistant') {
      return { ok: false, error: 'message role must be "user" or "assistant"' }
    }
    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      return { ok: false, error: 'message content must be a non-empty string' }
    }
    if (message.content.length > MAX_CONTENT_CHARS) {
      return { ok: false, error: `message content must be at most ${MAX_CONTENT_CHARS} characters` }
    }
    messages.push({ role: message.role, content: message.content })
  }

  if (messages[messages.length - 1].role !== 'user') {
    return { ok: false, error: 'the last message must be from the user' }
  }

  return { ok: true, messages, businessKey }
}

/**
 * Anthropic requires the first turn to be from the user; a client-side history
 * window can leave an assistant message first — trim to the first user turn.
 * Callers guarantee at least one user message (parseFounderChatBody enforces
 * the last message is from the user).
 */
export function trimToLeadingUserTurn(messages: FounderChatMessage[]): FounderChatMessage[] {
  return messages.slice(messages.findIndex((m) => m.role === 'user'))
}

/**
 * Founder-context system prompt. Honest about grounding: when a business is
 * selected but no context was retrieved, the assistant is told to say so —
 * never to fabricate estate facts.
 */
export function buildFounderSystemPrompt(
  businessName: string | null,
  contextBlock: string,
): string {
  const lines = [
    'You are the Unite-Group Nexus operator assistant — the founder\'s direct line to the estate\'s agent, inside the founder CRM.',
    'You talk to exactly one person: Phill McGurk, the founder. Be direct and concise; no filler, no flattery.',
    'Locale: Australian English (en-AU), dates DD/MM/YYYY, currency AUD, timezone AEST/AEDT.',
    'You do NOT have live access to databases, integrations, or the internet in this chat. If asked for live estate data you cannot see, say so plainly and point to the right surface (e.g. the Command Centre, Bookkeeper, or Xero pages) — never fabricate figures, statuses, or records.',
  ]
  if (businessName) {
    lines.push('', `The founder has grounded this conversation in the business "${businessName}".`)
    lines.push(
      contextBlock.length > 0
        ? `Business context retrieved for this question:\n${contextBlock}`
        : 'No business context was retrieved for this question — be transparent that your grounding is limited to general knowledge of the conversation.',
    )
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// SSE decoding (client side) — parses the hand-rolled `data: {...}` /
// `data: [DONE]` protocol the route streams (same protocol as /api/agent).
// ---------------------------------------------------------------------------

export interface FounderChatStreamEvent {
  delta?: string
  error?: string
}

export interface ExtractedSseEvents {
  events: FounderChatStreamEvent[]
  done: boolean
  /** Trailing partial segment — carry it into the next chunk. */
  rest: string
}

export function extractSseEvents(buffer: string): ExtractedSseEvents {
  const segments = buffer.split('\n\n')
  const rest = segments.pop() ?? ''
  const events: FounderChatStreamEvent[] = []
  let done = false

  for (const segment of segments) {
    for (const line of segment.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice('data: '.length).trim()
      if (payload === '[DONE]') {
        done = true
        continue
      }
      try {
        const parsed = JSON.parse(payload) as FounderChatStreamEvent
        if (typeof parsed.delta === 'string' || typeof parsed.error === 'string') {
          events.push(parsed)
        }
      } catch {
        // Malformed frame — skip it rather than abort the whole stream.
      }
    }
  }

  return { events, done, rest }
}
