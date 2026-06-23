'use client'

import { useState } from 'react'

interface ConceptImage {
  id: string
  url: string
  prompt: string
}
type Provider = 'gemini' | 'openai'
interface TurnResponse {
  status: 'ok' | 'not_connected'
  reason?: string
  agentMessage?: string
  concepts?: ConceptImage[]
  errors?: string[]
}

/**
 * Visual Campaign Studio — Phase 1 shell (Layout B: canvas-first, chat docked).
 * The founder describes a campaign; the design agent returns concept images.
 * Nothing publishes here — that is the gated lock step in a later phase.
 */
export function StudioClient({ taskId }: { taskId: string }) {
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<Provider>('gemini')
  const [concepts, setConcepts] = useState<ConceptImage[]>([])
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [messages, setMessages] = useState<{ role: 'founder' | 'agent'; text: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [notConnected, setNotConnected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const brief = input.trim()
    if (!brief || busy) return
    setBusy(true)
    setError(null)
    setNotConnected(null)
    setMessages((m) => [...m, { role: 'founder', text: brief }])
    setInput('')
    try {
      const res = await fetch('/api/studio/turn', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, message: brief, provider }),
      })
      if (!res.ok) {
        setError('The studio could not process that — please try again.')
        return
      }
      const data = (await res.json()) as TurnResponse
      if (data.status === 'not_connected') {
        setNotConnected(data.reason ?? 'Connect a brand profile to start designing.')
        return
      }
      const returnedConcepts = data.concepts ?? []
      setConcepts(returnedConcepts)
      if (data.agentMessage) setMessages((m) => [...m, { role: 'agent', text: data.agentMessage as string }])
      if (data.errors && data.errors.length) {
        // Surface every failure honestly. Frame it as a partial result when some
        // concepts still came through, so the founder isn't told it all failed.
        const prefix = returnedConcepts.length > 0 ? 'Some concepts failed: ' : 'No concepts could be generated: '
        setError(prefix + data.errors.join(' · '))
      }
    } catch {
      setError('Network error — could not reach the studio.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col bg-[#050505] text-white">
      <div className="flex-1 p-4" aria-label="Concept canvas">
        {notConnected ? (
          <div className="rounded-sm border border-[#00F5FF55] p-4 text-sm" role="alert">
            {notConnected}
          </div>
        ) : concepts.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Describe your campaign below and the design agent will generate concept directions.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3" aria-label="Concepts">
            {concepts.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Concept ${c.id}`}
                aria-pressed={chosenId === c.id}
                onClick={() => setChosenId(c.id)}
                className={`aspect-square overflow-hidden rounded-sm border bg-neutral-900 ${
                  chosenId === c.id ? 'border-[#00F5FF]' : 'border-neutral-700'
                }`}
              >
                <span
                  role="img"
                  aria-label={`Concept ${c.id} image`}
                  className="block h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${c.url})` }}
                />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1" aria-live="polite">
          {messages.map((m, i) => (
            <p key={i} className={`text-xs ${m.role === 'agent' ? 'text-[#00F5FF]' : 'text-neutral-300'}`}>
              {m.text}
            </p>
          ))}
          {error && (
            <p className="text-xs text-amber-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-neutral-800 p-3">
        <select
          aria-label="Image engine"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="rounded-sm border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs"
        >
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI (soon)</option>
        </select>
        <input
          aria-label="Campaign brief"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your campaign…"
          className="flex-1 rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Generate"
          className="rounded-sm bg-[#00F5FF] px-4 py-2 text-sm font-semibold text-[#04141a] disabled:opacity-60"
        >
          {busy ? 'Generating…' : 'Generate'}
        </button>
      </form>
    </div>
  )
}
