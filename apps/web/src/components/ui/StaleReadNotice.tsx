// StaleReadNotice — the shared mark for "this is the LAST GOOD read, not the
// current one".
//
// The No-Invaders work so far has been about the FIRST read failing: a panel
// that never loaded must not render a calm empty state. This file is about the
// sequence that actually happens in production — a read SUCCEEDS, a later poll
// / refresh / filter-change FAILS, and the panel keeps the previous payload on
// screen.
//
// Keeping the previous payload is deliberately NOT treated as the defect.
// Blanking a dashboard on one flaky poll is its own failure mode, and
// NotificationBell already chose the other way on purpose ("Keep any
// previously-loaded notifications on screen rather than blanking them; surface
// the failure alongside instead of replacing the data"). The defect is
// rendering that payload as though it were CURRENT and ACTIONABLE.
//
// So the contract every retaining surface must satisfy is two-sided:
//
//   1. VISIBLE — the founder can tell stale data from current data. That is
//      this notice, rendered above the retained region.
//   2. INERT — the founder cannot ACT on stale data as though it were current.
//      Controls that mutate the retained records are disabled until a read
//      succeeds again.
//
// The `data-stale-read="true"` attribute is the machine-readable half of the
// same statement. The census sweep in
// components/founder/__tests__/no-invaders-render-under-failure.test.tsx finds
// that region and asserts nothing inside it is still actionable, so a mutation
// control added to a stale region later is a RED run rather than a silent
// regression.
//
// Recovery controls (Refresh, a filter change, pagination) are NOT disabled —
// they are how the founder gets back to a live read, and disabling them would
// trap the surface in its degraded state.

/** Attribute marking a region whose contents came from an earlier, successful read. */
export const STALE_READ_ATTR = 'data-stale-read'

export interface StaleReadNoticeProps {
  /** Which surface's read failed, e.g. 'Work Packet Lane'. */
  source: string
  /**
   * Whether this surface disables its acting controls while stale. Read-only
   * surfaces have none, and claiming otherwise would be theatre.
   */
  actionsDisabled?: boolean
}

export function StaleReadNotice({ source, actionsDisabled = false }: StaleReadNoticeProps) {
  return (
    <p
      role="alert"
      data-stale-read-notice="true"
      className="px-5 py-2 font-mono text-[11px] leading-relaxed"
      style={{
        background: 'rgba(245,158,11,0.08)',
        borderLeft: '2px solid #f59e0b',
        color: '#b45309',
        margin: 0,
      }}
    >
      Stale · {source} — the latest refresh failed. Everything below is from an earlier
      successful read and may no longer be true.
      {actionsDisabled ? ' Actions are disabled until a read succeeds.' : ''}
    </p>
  )
}
