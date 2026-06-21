'use client'

// src/components/founder/contacts/ContactDetailClient.tsx
// Contact detail view (UNI-2062 Phase 4). Loads a single founder-scoped contact,
// shows its fields + status, and reuses ContactFormModal for editing. Honours the
// route-segment contract: explicit loading / error / not-found states.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/types/database'
import { ContactFormModal } from './ContactFormModal'

type IconProps = { size?: number; className?: string } & React.SVGProps<SVGSVGElement>

function ArrowLeft({ size = 14, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

function Pencil({ size = 13, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function Trash2({ size = 13, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  lead: { bg: '#8b8b8b18', fg: '#b0b0b0' },
  prospect: { bg: '#00F5FF18', fg: '#00F5FF' },
  client: { bg: '#22c55e18', fg: '#4ade80' },
  churned: { bg: '#ef444418', fg: '#f87171' },
  archived: { bg: '#6b728018', fg: '#9ca3af' },
}

function fullName(c: Contact): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'Unnamed contact'
}

interface ContactDetailClientProps {
  id: string
}

export function ContactDetailClient({ id }: ContactDetailClientProps) {
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchContact = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const res = await fetch(`/api/contacts/${id}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) {
        setError('Could not load this contact.')
        return
      }
      setContact((await res.json()) as Contact)
    } catch {
      setError('Could not load this contact.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchContact()
  }, [fetchContact])

  async function handleDelete() {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/founder/contacts')
        return
      }
      setError('Could not delete this contact.')
      setDeleting(false)
    } catch {
      setError('Could not delete this contact.')
      setDeleting(false)
    }
  }

  const backLink = (
    <Link
      href="/founder/contacts"
      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[#00F5FF] transition-colors"
    >
      <ArrowLeft /> Contacts
    </Link>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="h-5 w-48 bg-white/[0.06] rounded-sm animate-pulse" />
        <div className="bg-[#fff7ec] border border-white/[0.06] rounded-sm p-4 flex flex-col gap-3">
          <div className="h-2 w-2/3 bg-white/[0.06] rounded-sm animate-pulse" />
          <div className="h-2 w-1/2 bg-white/[0.06] rounded-sm animate-pulse" />
          <div className="h-2 w-3/4 bg-white/[0.06] rounded-sm animate-pulse" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-center">
          <p className="text-sm text-[var(--color-text-primary)]">Contact not found</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            It may have been deleted, or it belongs to a different account.
          </p>
        </div>
      </div>
    )
  }

  if (error && !contact) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <p className="text-[13px] text-white/60">{error}</p>
          <button
            onClick={fetchContact}
            className="border border-white/[0.12] text-white/60 text-[13px] rounded-sm px-4 py-2 hover:border-white/20 hover:text-white/80 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!contact) return null

  const status = contact.status ?? 'lead'
  const badge = STATUS_STYLE[status] ?? STATUS_STYLE.lead
  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Email', value: contact.email },
    { label: 'Phone', value: contact.phone },
    { label: 'Company', value: contact.company },
    { label: 'Role', value: contact.role },
  ]

  return (
    <div className="space-y-6">
      {backLink}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{fullName(contact)}</h1>
          <span
            className="inline-flex w-fit items-center rounded-sm px-2 py-0.5 text-xs font-medium capitalize"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-[13px] font-medium transition-colors"
            style={{ background: '#00F5FF18', color: '#00F5FF', border: '1px solid #00F5FF30' }}
          >
            <Pencil /> Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-sm border border-white/[0.12] px-3 py-2 text-[13px] text-white/60 hover:border-[#ef4444]/40 hover:text-[#f87171] transition-colors disabled:opacity-40"
          >
            <Trash2 /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Detail fields */}
      <div className="bg-[#fff7ec] border border-white/[0.06] rounded-sm divide-y divide-white/[0.06]">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-[13px] text-[var(--color-text-muted)]">{f.label}</span>
            <span className="text-[13px] text-[var(--color-text-primary)] text-right">
              {f.value ? f.value : <span className="text-[var(--color-text-muted)]">—</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm border border-white/[0.12] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {showEdit && (
        <ContactFormModal
          contact={contact}
          onClose={() => setShowEdit(false)}
          onSave={() => {
            setShowEdit(false)
            fetchContact()
          }}
        />
      )}
    </div>
  )
}
