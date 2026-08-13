'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Zap, Code2, Palette, Lightbulb, Plus, ExternalLink } from 'lucide-react'
import { StaleReadNotice } from '@/components/ui/StaleReadNotice'

interface TeamMember {
  id: string
  name: string
  role: 'ai-agent' | 'developer' | 'designer' | 'advisor'
  email: string | null
  github_login: string | null
  linear_user_id: string | null
  avatar_url: string | null
  active: boolean
  metadata: Record<string, string>
  created_at: string
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  'ai-agent':  <Zap size={13} style={{ color: '#15803d' }} />,
  'developer': <Code2 size={13} style={{ color: '#f97316' }} />,
  'designer':  <Palette size={13} style={{ color: '#f97316' }} />,
  'advisor':   <Lightbulb size={13} style={{ color: '#eab308' }} />,
}

const ROLE_COLORS: Record<string, string> = {
  'ai-agent':  '#16a34a',
  'developer': '#f97316',
  'designer':  '#f97316',
  'advisor':   '#eab308',
}

export function TeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'developer', email: '', github_login: '', linear_user_id: '' })
  const [submitting, setSubmitting] = useState(false)
  // A failed read left `members` at [] and rendered "0 team members" — a fact
  // the founder had no way to distinguish from an empty team.
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/boardroom/team')
      if (!res.ok) throw new Error('read failed')
      const d = await res.json() as { members: TeamMember[] }
      setMembers(d.members ?? [])
      // Cleared on SUCCESS only. Clearing on entry would un-mark the retained
      // roster the moment the Refresh control added alongside this is pressed.
      setLoadError(null)
    } catch {
      setLoadError('Could not load the team — this is a failed read, not an empty team.')
    } finally {
      setLoading(false)
    }
  }

  async function addMember() {
    if (!form.name.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/boardroom/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          email: form.email || undefined,
          github_login: form.github_login || undefined,
          linear_user_id: form.linear_user_id || undefined,
        }),
      })
      setForm({ name: '', role: 'developer', email: '', github_login: '', linear_user_id: '' })
      setShowForm(false)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const staleRead = Boolean(loadError) && members.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {/* The count is a claim about the team, so it may only be made from a
            read that succeeded. Adding the alert below was not enough on its
            own: `members` stays [] after a failed read, so this line went on
            stating "0 team members" NEXT TO the alert — a fabricated fact with
            a warning beside it. Found by independent review 11/08/2026. */}
        <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
          {loadError
            ? 'Team unavailable'
            : `${members.length} team member${members.length !== 1 ? 's' : ''}`}
        </p>
        {/* Recovery control. Before this the only re-read was `addMember`, so a
            failed team read — first or subsequent — left the founder with no
            retry short of a page reload, and no way to clear a stale roster.
            Not disabled while stale: it is the way back to a live read. */}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-[11px] px-2 py-1 rounded-sm"
          style={{ color: 'var(--color-text-disabled)', border: '1px solid var(--color-border)' }}
        >
          {loading ? 'loading…' : '↻ refresh'}
        </button>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-sm"
          style={{ background: '#16a34a', color: '#fffdf7' }}
        >
          <Plus size={11} />
          Add Member
        </button>
      </div>

      {showForm && (
        <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: 'rgba(22, 163, 74,0.2)', background: 'var(--surface-card)' }}>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name *"
              className="h-8 px-3 rounded-sm border text-[12px] outline-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'var(--surface-canvas)', color: 'var(--color-text-primary)' }}
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="h-8 px-3 rounded-sm border text-[12px] outline-hidden bg-transparent"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {['developer', 'designer', 'advisor', 'ai-agent'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              className="h-8 px-3 rounded-sm border text-[12px] outline-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'var(--surface-canvas)', color: 'var(--color-text-primary)' }}
            />
            <input
              value={form.github_login}
              onChange={(e) => setForm((f) => ({ ...f, github_login: e.target.value }))}
              placeholder="GitHub login"
              className="h-8 px-3 rounded-sm border text-[12px] outline-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'var(--surface-canvas)', color: 'var(--color-text-primary)' }}
            />
            <input
              value={form.linear_user_id}
              onChange={(e) => setForm((f) => ({ ...f, linear_user_id: e.target.value }))}
              placeholder="Linear user ID"
              className="h-8 px-3 rounded-sm border text-[12px] outline-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'var(--surface-canvas)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void addMember()}
              disabled={!form.name.trim() || submitting}
              className="px-4 h-8 rounded-sm text-[12px] font-medium disabled:opacity-40"
              style={{ background: '#16a34a', color: '#fffdf7' }}
            >
              Add to Team
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 h-8 rounded-sm text-[12px] border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div role="alert" className="rounded-sm border p-4 text-[12px]" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
          {loadError}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 animate-pulse" aria-label="Loading team members">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-sm border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--surface-card)', borderLeft: '3px solid var(--surface-elevated)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-sm shrink-0" style={{ background: 'var(--surface-elevated)' }} />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 rounded-sm w-28" style={{ background: 'var(--surface-elevated)' }} />
                  <div className="h-2.5 rounded-sm w-16" style={{ background: 'var(--surface-elevated)' }} />
                </div>
              </div>
              <div className="h-2 rounded-sm w-40 mt-2" style={{ background: 'var(--surface-elevated)' }} />
            </div>
          ))}
        </div>
      )}

      {/* The count above was fixed on 11/08; the ROSTER was not. `members` is
          retained across a failed read, and `addMember` re-reads via `load()`,
          so adding someone whose confirming read fails leaves the previous
          roster on screen looking current — the new member simply absent, with
          no indication the list is a photograph. Marked rather than blanked.
          The cards carry no controls that act on a member, so this is the
          VISIBLE half only and `actionsDisabled` stays off. [UNI-2476] */}
      {staleRead && <StaleReadNotice source="Boardroom team" />}

      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
        data-stale-read={staleRead ? 'true' : undefined}
      >
        {members.map((m) => {
          const roleColor = ROLE_COLORS[m.role] ?? 'var(--color-text-disabled)'
          const isAI = m.role === 'ai-agent'
          return (
            <div
              key={m.id}
              className="rounded-sm border p-4"
              style={{
                borderColor: isAI ? 'rgba(22, 163, 74,0.3)' : 'var(--color-border)',
                background: 'var(--surface-card)',
                borderLeft: `3px solid ${roleColor}`,
              }}
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-sm flex items-center justify-center text-[12px] font-medium shrink-0"
                  style={{
                    background: `${roleColor}20`,
                    color: roleColor,
                    border: `1px solid ${roleColor}40`,
                  }}
                >
                  {m.avatar_url ? (
                    <Image src={m.avatar_url} alt={m.name} width={36} height={36} className="w-full h-full rounded-sm object-cover" />
                  ) : (
                    getInitials(m.name)
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{m.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {ROLE_ICONS[m.role]}
                    <span className="text-[10px]" style={{ color: roleColor }}>{m.role}</span>
                  </div>
                </div>
              </div>

              {m.metadata?.description && (
                <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>{m.metadata.description}</p>
              )}

              {/* Links */}
              <div className="flex gap-2 flex-wrap">
                {m.github_login && (
                  <a
                    href={`https://github.com/${m.github_login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px]"
                    style={{ color: 'var(--color-text-disabled)' }}
                  >
                    <ExternalLink size={9} />
                    GitHub
                  </a>
                )}
                {m.email && (
                  <span className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>{m.email}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
