'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const json: NotificationsResponse = await res.json()
      setData(json)
    } catch {
      // fire-and-forget — silently ignore network errors
    }
  }, [])

  // Initial fetch + 60s polling
  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
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
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      await fetchNotifications()
    } catch {
      // fire-and-forget
    }
  }

  const unread = data?.unreadCount ?? 0
  const recent = (data?.notifications ?? []).slice(0, 5)

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
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

        {/* Red badge */}
        {unread > 0 && (
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
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            background: '#fffdf7',
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
            {unread > 0 && (
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

          {recent.length === 0 ? (
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
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {recent.map((n) => (
                <li
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id) }}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? 'transparent' : 'rgba(22, 163, 74, 0.03)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: n.read ? 'var(--color-text-muted)' : '#fff',
                        textTransform: 'capitalize',
                        marginBottom: 2,
                      }}
                    >
                      {n.type.replace(/_/g, ' ')}
                    </div>
                    {typeof n.payload?.message === 'string' && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--color-text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.payload.message}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--color-text-muted)',
                        marginTop: 3,
                        opacity: 0.6,
                      }}
                    >
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
