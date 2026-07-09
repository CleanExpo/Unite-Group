'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  email: string
  label: string
}

export function ImapConnectForm({ email, label }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/imap/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Connection failed')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — check connection')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] uppercase tracking-wider hover:text-[#3f3f46] transition-colors shrink-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Connect →
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-1">
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label} · SiteGround
      </p>
      <input
        type="password"
        placeholder="Email password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoFocus
        className="bg-(--surface-card) border border-border rounded-sm px-2 py-1 text-xs text-(--color-text-primary) placeholder-(--color-text-muted) focus:border-[#16a34a] focus:outline-hidden"
      />
      {error && <p className="text-red-700 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="text-xs bg-[#16a34a] text-black px-3 py-1 rounded-sm font-medium hover:opacity-80 disabled:opacity-40"
        >
          {loading ? 'Connecting…' : 'Connect'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[#52525b] hover:text-[#52525b]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
