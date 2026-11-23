'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { STALE_READ_ATTR, StaleReadNotice } from '@/components/ui/StaleReadNotice'

interface NotificationItem {
  id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  read_at: string | null
  created_at: string
}

interface NotificationsResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Whether the LATEST read failed. Separate from `error` on purpose: `error` is
  // cleared when a read starts and is also written by a failed mark-as-read, so
  // a mark derived from it would drop while a replacement read is still in
  // flight and would fire on a failed PATCH that left the read itself good.
  // Only a successful read clears this. [UNI-2500]
  const [readFailed, setReadFailed] = useState(false)
  const [popup, setPopup] = useState({ left: 0, width: 320, maxHeight: 400 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const requestSequence = useRef(0)
  const popupId = useId()

  const positionPopup = useCallback(() => {
    const wrapper = dropdownRef.current
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const main = wrapper.closest('main')?.getBoundingClientRect()
    const leftEdge = Math.max(8, (main?.left ?? 0) + 8)
    const rightEdge = Math.min(window.innerWidth - 8, main && main.right > leftEdge ? main.right - 8 : window.innerWidth - 8)
    const width = Math.min(320, Math.max(0, rightEdge - leftEdge))
    const left = Math.max(leftEdge, Math.min(rect.right - width, rightEdge - width))
    setPopup({ left: left - rect.left, width, maxHeight: Math.max(100, window.innerHeight - rect.bottom - 24) })
  }, [])

  const fetchNotifications = useCallback(async () => {
    const request = ++requestSequence.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      const json = await res.json() as NotificationsResponse & { error?: string }
      if (!res.ok) throw new Error(json?.error || 'Notifications are currently unavailable. Please try again.')
      if (!json || !Array.isArray(json.notifications) || !Number.isInteger(json.unreadCount) || json.unreadCount < 0 || !json.notifications.every(item => item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.read === 'boolean' && typeof item.created_at === 'string')) throw new Error('Notifications returned an unreadable response. Please try again.')
      if (request === requestSequence.current) {
        setData(json)
        setReadFailed(false)
      }
    } catch (cause) {
      if (request === requestSequence.current) setReadFailed(true)
      if (request === requestSequence.current) setError(cause instanceof Error && !(cause instanceof SyntaxError) ? cause.message : 'Notifications could not be loaded. Please try again.')
    } finally {
      if (request === requestSequence.current) setLoading(false)
    }
  }, [])

  // Initial fetch + 60s polling
  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      requestSequence.current += 1
    }
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); dropdownRef.current?.querySelector('button')?.focus() }
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('resize', positionPopup)
    window.addEventListener('scroll', positionPopup, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', positionPopup)
      window.removeEventListener('scroll', positionPopup, true)
    }
  }, [open, positionPopup])

  async function markRead(id: string) {
    setError(null)
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) {
        const result = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error || 'This notification could not be marked as read. Please try again.')
      }
      await fetchNotifications()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This notification could not be marked as read. Please try again.')
    }
  }

  const unread = data?.unreadCount ?? 0
  const recent = (data?.notifications ?? []).slice(0, 5)
  // The count and the rows on screen came from an earlier read and the latest
  // one failed. Keyed on `data`, not on rows: the count is stale even when the
  // retained list is empty. [UNI-2500]
  const stale = readFailed && data !== null
  const staleMark = stale ? { [STALE_READ_ATTR]: 'true' } : {}
  const bellLabel = readFailed
    ? data
      ? `Notifications — last known ${unread} unread, latest read failed`
      : 'Notifications — latest read failed'
    : `Notifications${unread > 0 ? ` — ${unread} unread` : ''}`

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => { if (!open) positionPopup(); setOpen((v) => !v) }}
        aria-label={bellLabel}
        aria-expanded={open}
        aria-controls={popupId}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          color: 'var(--color-text-muted)',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
        }}
      >
        {/* Inline SVG bell */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Failed-read badge: no number, because the last known count is not current. */}
        {readFailed && (
          <span
            aria-hidden="true"
            data-bell-badge="read-failed"
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              background: '#f59e0b',
              color: '#1f1300',
              borderRadius: '2px',
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              minWidth: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
            }}
          >
            !
          </span>
        )}

        {/* Red badge: only a count from a read that is still current. */}
        {!readFailed && unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '2px',
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              minWidth: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id={popupId}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: popup.left,
            width: popup.width,
            maxHeight: popup.maxHeight,
            overflowY: 'auto',
            boxSizing: 'border-box',
            background: 'var(--surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
              }}
            >
              Notifications
            </span>
            {stale ? (
              <span
                {...staleMark}
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                }}
              >
                last known {unread} unread
              </span>
            ) : unread > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: '#15803d',
                  fontWeight: 600,
                }}
              >
                {unread} unread
              </span>
            )}
          </div>

          {stale && <StaleReadNotice source="Notifications" actionsDisabled />}
          {error && <div role="alert" style={{ padding: '14px', fontSize: 12, color: 'var(--color-danger)', overflowWrap: 'anywhere' }}><p>{error}</p><button type="button" disabled={loading} onClick={() => void fetchNotifications()} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '8px 10px', marginTop: 8, cursor: 'pointer' }}>Retry notifications</button></div>}
          {loading && !data && <p role="status" style={{ padding: '14px', fontSize: 12, color: 'var(--color-text-muted)' }}>Loading notifications…</p>}
          {data && !error && !loading && recent.length === 0 && (
            <div
              style={{
                padding: '20px 14px',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--color-text-muted)',
              }}
            >
              No notifications yet
            </div>
          )}
          {recent.length > 0 && (
            <ul {...staleMark} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {recent.map((n) => {
                const rowStyle = {
                  padding: '10px 14px',
                  background: n.read ? 'transparent' : 'rgba(22, 163, 74, 0.03)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                } as const
                const message = typeof n.payload?.message === 'string' ? n.payload.message : null
                const body = (
                  <>
                    {/* Unread dot */}
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '1px',
                        background: n.read ? 'transparent' : '#16a34a',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    {/* Spans, not divs: this body can sit inside a <button>. */}
                    <span style={{ display: 'block', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 600,
                          color: n.read ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                          textTransform: 'capitalize',
                          marginBottom: 2,
                        }}
                      >
                        {n.type.replace(/_/g, ' ')}
                      </span>
                      {message !== null && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {message}
                        </span>
                      )}
                      <span
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: 'var(--color-text-muted)',
                          marginTop: 3,
                          opacity: 0.6,
                        }}
                      >
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </>
                )
                return (
                  <li key={n.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {n.read ? (
                      <div style={rowStyle}>{body}</div>
                    ) : (
                      // A real button, so marking as read is reachable by keyboard and
                      // can be disabled while the list is stale. [UNI-2500]
                      <button
                        type="button"
                        disabled={stale}
                        aria-label={`Mark as read: ${n.type.replace(/_/g, ' ')}${message !== null ? ` — ${message}` : ''}`}
                        onClick={() => void markRead(n.id)}
                        style={{
                          ...rowStyle,
                          width: '100%',
                          border: 'none',
                          margin: 0,
                          font: 'inherit',
                          color: 'inherit',
                          textAlign: 'left',
                          cursor: stale ? 'not-allowed' : 'pointer',
                          opacity: stale ? 0.6 : 1,
                        }}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
