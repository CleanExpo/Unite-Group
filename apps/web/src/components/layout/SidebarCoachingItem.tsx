// src/components/layout/SidebarCoachingItem.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, GraduationCap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CoachingEngagementRow } from '@/app/api/coaching/engagements/route'

interface SidebarCoachingItemProps {
  collapsed: boolean
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; engagements: CoachingEngagementRow[] }
  | { kind: 'error'; message: string }

/**
 * Coaching Clinic — sidebar entry with a flyout client picker.
 *
 * The flyout comes OUT to the side of the sidebar and then drops down, so it
 * cannot be an inline expander like SidebarBusinessItem. The sidebar <aside> is
 * overflow-hidden and its scroll container is overflow-x-hidden, so a panel
 * positioned left-full would be clipped — it is portalled to the body and
 * positioned from the trigger's bounding rect instead.
 */
export function SidebarCoachingItem({ collapsed }: SidebarCoachingItemProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)

  const isActive = pathname.startsWith('/founder/coaching')

  const positionFlyout = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    // Out to the side (right edge of the SIDEBAR), then drops down from the row.
    // Anchoring to the trigger's own right edge put the panel 24px inside the
    // aside, covering its border and scroll bar — the chevron sits well within
    // the 240px rail. Measure the aside instead, and drop from the row so the
    // panel's top lines up with the row rather than the 16px icon inside it.
    const row = trigger.closest('div')
    const rail = trigger.closest('aside')
    const rowRect = (row ?? trigger).getBoundingClientRect()
    const railRight = rail?.getBoundingClientRect().right ?? trigger.getBoundingClientRect().right
    // Clamp to the viewport. The panel is max-w-[320px], and moving the anchor
    // out to the rail pushed it 28px further right — on a narrow window that
    // would run it off the screen edge, where it cannot be read or clicked.
    // Overlapping the rail is the better failure than being unreachable.
    const MAX_PANEL = 320
    const EDGE_GAP = 8
    const rightmost = window.innerWidth - MAX_PANEL - EDGE_GAP
    const left = Math.max(EDGE_GAP, Math.min(railRight + 4, rightmost))
    setAnchor({ top: rowRect.top, left })
  }, [])

  // Fetch lazily — the sidebar renders on every founder page, the flyout does not.
  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/coaching/engagements')
      // An expired session does NOT come back as 401 here: proxy.ts redirects
      // every unauthenticated request, /api included, to /auth/login. fetch
      // follows that 307, so res.ok is true and res.json() then throws on the
      // login HTML — which surfaced as a bare "Couldn't load clients".
      if (res.redirected && new URL(res.url).pathname.startsWith('/auth/login')) {
        setState({ kind: 'error', message: 'Session expired — sign in again' })
        return
      }
      if (!res.ok) {
        setState({ kind: 'error', message: `Couldn't load clients (${res.status})` })
        return
      }
      const json = await res.json()
      setState({ kind: 'ready', engagements: json.engagements ?? [] })
    } catch {
      setState({ kind: 'error', message: "Couldn't load clients" })
    }
  }, [])

  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) return false
      positionFlyout()
      if (state.kind === 'idle' || state.kind === 'error') void load()
      return true
    })
  }, [load, positionFlyout, state.kind])

  // Close on outside click, Escape, scroll or resize. Reposition is not
  // attempted on scroll — the anchor would drift from a moving trigger.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (flyoutRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReflow = () => setOpen(false)

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open])

  // Close when the route changes — the flyout is a picker, not a panel.
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className="nav-item-hover relative w-full flex items-center gap-2 px-2 h-8 rounded-sm text-[13px] font-medium transition-colors duration-100"
        style={isActive
          ? { color: 'var(--color-text-primary)', background: 'var(--surface-elevated)' }
          : { color: 'var(--color-text-muted)' }
        }
      >
        <GraduationCap size={16} strokeWidth={1.75} className="shrink-0" />
        {!collapsed ? (
          <>
            <Link href="/founder/coaching" className="flex-1 text-left truncate hover:underline">
              Coaching Clinic
            </Link>
            <button
              ref={triggerRef}
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={open ? 'Close client list' : 'Open client list'}
              className="shrink-0 p-0.5 rounded-sm transition-colors duration-100"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              <ChevronRight
                size={12}
                strokeWidth={2}
                className={cn('transition-transform duration-150', open && 'rotate-90')}
              />
            </button>
          </>
        ) : (
          <button
            ref={triggerRef}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Coaching Clinic clients"
            className="absolute inset-0"
          />
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && anchor && (
            <motion.div
              ref={flyoutRef}
              role="menu"
              aria-label="Coaching clients"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
              className="fixed z-[60] min-w-[240px] max-w-[320px] max-h-[60vh] overflow-y-auto rounded-sm border py-1 shadow-lg"
              style={{
                top: anchor.top,
                left: anchor.left,
                background: 'var(--surface-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="px-3 pb-1 text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-text-disabled)' }}
              >
                Clients
              </div>

              {state.kind === 'loading' && (
                <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>
                  Loading…
                </div>
              )}

              {state.kind === 'error' && (
                <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-danger, #dc2626)' }}>
                  {state.message}
                </div>
              )}

              {state.kind === 'ready' && state.engagements.length === 0 && (
                <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>
                  No coaching clients yet
                </div>
              )}

              {state.kind === 'ready' && state.engagements.map((e) => (
                <Link
                  key={e.id}
                  href={`/founder/coaching/${e.id}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="nav-item-hover flex items-center gap-2 px-3 h-7 text-[12px] transition-colors duration-100"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <span className="truncate">{e.label}</span>
                  {!e.consent_given && (
                    <span
                      className="ml-auto shrink-0 rounded-sm px-1 text-[9px] uppercase tracking-wide"
                      style={{ background: 'var(--surface-elevated)', color: 'var(--color-text-disabled)' }}
                      title="No recording/publication consent on file"
                    >
                      no consent
                    </span>
                  )}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
