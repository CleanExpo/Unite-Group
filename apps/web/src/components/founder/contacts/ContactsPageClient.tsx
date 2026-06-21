'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import type { Contact } from '@/types/database'
import { ContactsTable } from './ContactsTable'
import { ContactFormModal } from './ContactFormModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_OPTIONS = ['all', 'lead', 'prospect', 'client', 'churned', 'archived'] as const

export function ContactsPageClient() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const deletingRef = useRef<Set<string>>(new Set())

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts')
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(data.contacts ?? data)
      setError(false)
    } catch {
      // Honest hard-error state — never fabricate an empty CRM (No-Invaders #1).
      // Do NOT reset contacts to []: a failed fetch must not masquerade as "no contacts yet".
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const filtered = useMemo(() => {
    let result = contacts

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase()
        const email = (c.email ?? '').toLowerCase()
        const company = (c.company ?? '').toLowerCase()
        return name.includes(q) || email.includes(q) || company.includes(q)
      })
    }

    return result
  }, [contacts, statusFilter, search])

  const stats = useMemo(() => {
    const counts = { lead: 0, prospect: 0, client: 0 }
    for (const c of contacts) {
      if (c.status in counts) {
        counts[c.status as keyof typeof counts]++
      }
    }
    return counts
  }, [contacts])

  function handleEdit(contact: Contact) {
    setEditingContact(contact)
    setShowModal(true)
  }

  async function handleDelete(id: string) {
    // In-flight guard (audit 4.3): a fast double-click must not fire duplicate
    // DELETE requests for the same contact.
    if (deletingRef.current.has(id)) return
    deletingRef.current.add(id)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      // Silently handle
    } finally {
      deletingRef.current.delete(id)
    }
  }

  function handleModalClose() {
    setShowModal(false)
    setEditingContact(null)
  }

  function handleSave() {
    handleModalClose()
    fetchContacts()
  }

  const inputClass =
    'rounded-sm border border-[var(--color-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[#16a34a] focus:outline-none'

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Contacts"
        subtitle="Your CRM contacts across all businesses"
        actions={
          <button
            onClick={() => {
              setEditingContact(null)
              setShowModal(true)
            }}
            className="rounded-sm px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: '#16a34a18',
              color: '#16a34a',
              border: '1px solid #16a34a30',
            }}
          >
            Add Contact
          </button>
        }
      />

      {!loading && error ? (
        <div
          className="rounded-sm p-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
          role="alert"
        >
          <span className="text-[13px]" style={{ color: 'var(--color-danger, #ef4444)' }}>
            Contacts unavailable — couldn’t load. Refresh to try again.
          </span>
        </div>
      ) : !loading && contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start building your CRM across all businesses."
          action={{
            label: 'Add Contact',
            href: '#',
            onClick: () => {
              setEditingContact(null)
              setShowModal(true)
            },
          }}
        />
      ) : (
        <>
          {/* Summary stat badges */}
          <div className="flex gap-3">
            {([
              { label: 'Leads', count: stats.lead, colour: '#3b82f6' },
              { label: 'Prospects', count: stats.prospect, colour: '#f97316' },
              { label: 'Clients', count: stats.client, colour: '#22c55e' },
            ] as const).map(({ label, count, colour }) => (
              <div
                key={label}
                className="rounded-sm px-3 py-1.5 text-xs font-medium"
                style={{
                  background: `${colour}15`,
                  color: colour,
                  border: `1px solid ${colour}30`,
                }}
              >
                {label}: {count}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-sm border border-[var(--color-border)] bg-[var(--surface-card)]">
            <ContactsTable
              contacts={filtered}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ContactFormModal
          contact={editingContact}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
