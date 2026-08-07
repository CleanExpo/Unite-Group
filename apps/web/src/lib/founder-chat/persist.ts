// src/lib/founder-chat/persist.ts
// Pure helpers for founder-chat thread persistence (UNI-2373 P6).

import {
  MAX_CONTENT_CHARS,
  MAX_MESSAGES,
  type FounderChatMessage,
} from './messages'

export interface FounderChatThreadPayload {
  messages: FounderChatMessage[]
  businessKey: string | null
  updatedAt: string | null
}

export function normaliseStoredMessages(raw: unknown): FounderChatMessage[] {
  if (!Array.isArray(raw)) return []
  const out: FounderChatMessage[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const message = entry as { role?: unknown; content?: unknown }
    if (message.role !== 'user' && message.role !== 'assistant') continue
    if (typeof message.content !== 'string') continue
    const content = message.content
    if (content.trim().length === 0) continue
    if (content.length > MAX_CONTENT_CHARS) continue
    out.push({ role: message.role, content })
    if (out.length >= MAX_MESSAGES) break
  }
  return out
}

export function parsePersistBody(
  raw: unknown,
):
  | { ok: true; messages: FounderChatMessage[]; businessKey: string | null }
  | { ok: false; error: string } {
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
    if (trimmed.length > 120) {
      return { ok: false, error: 'businessKey must be at most 120 characters' }
    }
    businessKey = trimmed.length > 0 ? trimmed : null
  }

  if (!Array.isArray(body.messages)) {
    return { ok: false, error: 'messages must be an array' }
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

  return { ok: true, messages, businessKey }
}
