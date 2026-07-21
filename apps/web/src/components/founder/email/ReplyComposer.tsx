'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface Props {
  threadId: string
  account: string
  defaultTo: string
  defaultSubject: string
  inReplyToMessageId?: string
  onSent: () => void
  onCancel: () => void
}

export function ReplyComposer({ threadId, account, defaultTo, defaultSubject, inReplyToMessageId, onSent, onCancel }: Props) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  async function handleDraft() {
    setDrafting(true)
    setDraftError(null)
    try {
      const res = await fetch('/api/email/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, threadId }),
      })
      const data = await res.json() as { body?: string; error?: string }
      if (!res.ok || !data.body) {
        setDraftError(data.error ?? 'Draft failed')
        return
      }
      setBody(data.body)
    } catch {
      setDraftError('Network error — check connection')
    } finally {
      setDrafting(false)
    }
  }

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/email/threads/${threadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          action: 'reply',
          to: defaultTo,
          subject: defaultSubject.startsWith('Re:') ? defaultSubject : `Re: ${defaultSubject}`,
          body,
          inReplyToMessageId,
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Send failed')
        return
      }
      onSent()
    } catch {
      setError('Network error — check connection')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-white/6 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5f5f66]">
          Reply to <span className="text-[#52525b]">{defaultTo}</span>
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDraft}
            disabled={drafting}
            aria-label="Draft with the skill"
            aria-busy={drafting}
            className="flex items-center gap-1.5 text-xs border border-white/20 px-2.5 py-1 rounded-sm text-[#52525b] hover:text-[#0A0A0A] hover:border-white/40 transition-colors disabled:opacity-40"
          >
            {drafting
              ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              : <Sparkles className="w-3 h-3" aria-hidden="true" />}
            {drafting ? 'Drafting…' : 'Draft with the skill'}
          </button>
          <button onClick={onCancel} className="text-xs text-[#5f5f66] hover:text-[#52525b] transition-colors">
            Cancel
          </button>
        </div>
      </div>
      {draftError && <p role="alert" className="text-red-700 text-xs">{draftError}</p>}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write your reply…"
        rows={5}
        autoFocus
        className="w-full bg-(--surface-card) border border-border rounded-sm px-3 py-2 text-sm text-(--color-text-primary) placeholder-(--color-text-muted) focus:border-[#16a34a] focus:outline-hidden resize-none"
      />
      {error && <p className="text-red-700 text-xs">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="text-xs bg-[#16a34a] text-black px-4 py-1.5 rounded-sm font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
        >
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}
