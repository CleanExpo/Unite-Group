'use client'

// src/app/(founder)/founder/chat/ChatClient.tsx
//
// Client thread UI for the founder chat lane. Command-deck aesthetic via the
// shared operator-gateway theme tokens (same reuse pattern as the sibling
// /founder/agents page). In-memory session only — refresh clears the thread.

import { useRef, useState } from 'react'
import { theme } from '../command-centre/operator-gateway/_components'
import {
  MAX_MESSAGES,
  extractSseEvents,
  type FounderChatMessage,
} from '@/lib/founder-chat/messages'

export interface ChatBusiness {
  slug: string
  name: string
}

const wrap: React.CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '2rem 1.25rem 3rem',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  color: theme.text,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 'calc(100vh - 4rem)',
}

const panel: React.CSSProperties = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 2,
}

const monoLabel: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: theme.muted,
  fontFamily: 'var(--font-mono, monospace)',
}

export function ChatClient({
  businesses,
  businessLoadError,
  signedIn,
}: {
  businesses: ChatBusiness[]
  businessLoadError: string | null
  signedIn: boolean
}) {
  const [messages, setMessages] = useState<FounderChatMessage[]>([])
  const [input, setInput] = useState('')
  const [businessKey, setBusinessKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  function appendAssistantDelta(delta: string) {
    setMessages((current) => {
      const next = [...current]
      const last = next[next.length - 1]
      if (last?.role === 'assistant') {
        next[next.length - 1] = { role: 'assistant', content: last.content + delta }
      } else {
        next.push({ role: 'assistant', content: delta })
      }
      return next
    })
  }

  async function send() {
    const content = input.trim()
    if (!content || busy) return

    const thread = [...messages, { role: 'user' as const, content }]
    setMessages(thread)
    setInput('')
    setError(null)
    setBusy(true)

    try {
      const response = await fetch('/api/founder/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // Windowed to the route's cap; the route trims a leading assistant turn.
          messages: thread.slice(-MAX_MESSAGES),
          ...(businessKey ? { businessKey } : {}),
        }),
      })

      if (!response.ok) {
        let message = `Request failed (${response.status})`
        try {
          const body = (await response.json()) as { error?: string }
          if (body.error) message = body.error
        } catch {
          // Non-JSON error body — keep the status message.
        }
        throw new Error(message)
      }
      if (!response.body) throw new Error('Response had no body to stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamDone = false
      while (!streamDone) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const extracted = extractSseEvents(buffer)
        buffer = extracted.rest
        for (const event of extracted.events) {
          if (typeof event.delta === 'string') appendAssistantDelta(event.delta)
          if (typeof event.error === 'string') setError(event.error)
        }
        if (extracted.done) streamDone = true
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message')
    } finally {
      setBusy(false)
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 0.25rem' }}>Chat</h1>
        <span style={monoLabel}>claude · streamed live · session in memory</span>
      </div>
      <p style={{ color: theme.muted, marginTop: 0, fontSize: 14 }}>
        Direct line to the estate&apos;s agent from the CRM — no Telegram required. Real model
        responses only; the assistant has no live database access and says so rather than
        inventing figures.
      </p>

      {!signedIn && (
        <div style={{ ...panel, borderColor: theme.bad, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
          <span style={{ color: theme.bad, fontSize: 14 }}>Not signed in — messages will be rejected (401).</span>
        </div>
      )}

      {/* Thread */}
      <div
        style={{
          ...panel,
          flex: 1,
          minHeight: 320,
          padding: '1rem 1.25rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
        aria-label="chat thread"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <p style={{ color: theme.muted, fontSize: 14, margin: 'auto', textAlign: 'center' }}>
            No messages yet. Ask the operator assistant anything — select a business below to
            ground answers in its content.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              border: `1px solid ${message.role === 'user' ? theme.borderSoft : theme.border}`,
              borderLeft: `3px solid ${message.role === 'user' ? theme.ok : theme.info}`,
              borderRadius: 2,
              background: message.role === 'user' ? '#11151c' : '#0b0e14',
              padding: '0.6rem 0.8rem',
            }}
          >
            <div style={{ ...monoLabel, marginBottom: 4 }}>
              {message.role === 'user' ? 'founder' : 'agent'}
            </div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
              {message.content || (busy && index === messages.length - 1 ? '…' : '')}
            </div>
          </div>
        ))}
        {busy && messages[messages.length - 1]?.role === 'user' && (
          <div style={{ ...monoLabel, alignSelf: 'flex-start' }}>agent is responding…</div>
        )}
        <div ref={threadEndRef} />
      </div>

      {error && (
        <div
          role="alert"
          style={{ ...panel, borderColor: theme.bad, padding: '0.75rem 1rem', marginTop: '0.75rem' }}
        >
          <span style={{ color: theme.bad, fontSize: 13, fontFamily: 'var(--font-mono, monospace)' }}>
            {error}
          </span>
        </div>
      )}

      {/* Composer */}
      <div style={{ ...panel, marginTop: '0.75rem', padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <label htmlFor="chat-business" style={monoLabel}>
            Grounding
          </label>
          <select
            id="chat-business"
            value={businessKey}
            onChange={(event) => setBusinessKey(event.target.value)}
            disabled={busy}
            style={{
              background: '#0b0e14',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 2,
              padding: '0.35rem 0.5rem',
              fontSize: 13,
            }}
          >
            <option value="">No business (general)</option>
            {businesses.map((business) => (
              <option key={business.slug} value={business.slug}>
                {business.name}
              </option>
            ))}
          </select>
          {businessLoadError && (
            <span style={{ color: theme.warn, fontSize: 12 }}>
              Businesses failed to load: {businessLoadError}
            </span>
          )}
          {businesses.length === 0 && !businessLoadError && signedIn && (
            <span style={{ color: theme.muted, fontSize: 12 }}>No businesses on file — general chat only.</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            placeholder="Message the operator assistant… (Enter to send, Shift+Enter for a new line)"
            disabled={busy}
            aria-label="chat message"
            style={{
              flex: 1,
              resize: 'vertical',
              background: '#0b0e14',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 2,
              padding: '0.6rem 0.75rem',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            style={{
              background: busy || !input.trim() ? theme.borderSoft : '#12361f',
              color: busy || !input.trim() ? theme.muted : theme.ok,
              border: `1px solid ${busy || !input.trim() ? theme.border : '#238636'}`,
              borderRadius: 2,
              padding: '0.6rem 1.1rem',
              fontSize: 14,
              fontWeight: 700,
              cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Streaming…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
