import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { DispatchPanel } from '../DispatchPanel'

// Why this lives here and not in the no-invaders census:
// DispatchPanel reloads only through `useEffect(..., [filterBiz])`, so
// `driveFixture` — which provokes a second read via a captured poll or a Refresh
// control — has no way to trigger it. That blind spot is UNI-2488; this surface
// was one of the four it enumerated as never assessed. The reload is driven here
// by clicking a business filter, which no generic fixture harness can do.
//
// Only the VISIBLE half is asserted, and deliberately so: the retained rows
// carry no acting control. The single affordance is an "Open in Linear" link,
// which the contract treats as the REMEDY for staleness rather than an act on
// it, so there is no inertness to prove and the notice does not claim any.
// [UNI-2494]

const DISPATCH = {
  id: 'd-1',
  title: 'Retained dispatch',
  description: null,
  business_key: 'dr',
  type: 'build',
  priority: 2,
  status: 'queued',
  deadline: null,
  linear_issue_url: null,
  created_at: '2026-08-01T00:00:00Z',
}

let failing = false

describe('DispatchPanel: retained dispatches must be marked stale', () => {
  beforeEach(() => {
    failing = false
    global.fetch = vi.fn(async () => {
      if (failing) throw new Error('network down')
      return {
        ok: true,
        status: 200,
        json: async () => ({ dispatches: [DISPATCH] }),
      } as unknown as Response
    }) as never
  })

  afterEach(() => vi.restoreAllMocks())

  // NEGATIVE CONTROL. Without it, a panel that marked everything stale would
  // satisfy the failure assertion perfectly.
  it('marks nothing while the read is SUCCEEDING', async () => {
    render(<DispatchPanel />)
    await screen.findByText('Retained dispatch')
    expect(
      document.querySelector('[data-stale-read="true"]'),
      'marked a SUCCESSFUL read as stale',
    ).toBeNull()
  })

  it('marks the retained rows after a FAILED reload', async () => {
    render(<DispatchPanel />)
    await screen.findByText('Retained dispatch')

    // The reload is driven by a dependency change: clicking a filter re-runs
    // the effect. There is no poll and no refresh control on this surface.
    failing = true
    const filter = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Disaster Recovery',
    ) ?? Array.from(document.querySelectorAll('button')).find(
      (b) => /^[A-Z]/.test(b.textContent?.trim() ?? '') && b.textContent?.trim() !== 'All',
    )
    expect(filter, 'no business filter to drive the reload').toBeTruthy()
    await act(async () => {
      fireEvent.click(filter as HTMLButtonElement)
    })

    await waitFor(() =>
      expect(
        document.querySelector('[data-stale-read="true"]'),
        'kept the previous dispatches after a FAILED reload without marking them stale',
      ).not.toBeNull(),
    )
    // Marked in words, not only in an attribute.
    expect(
      document.querySelector('[data-stale-read-notice="true"]'),
      'marked the region but told the founder nothing',
    ).not.toBeNull()
    // Retained, not deleted.
    expect(screen.getByText('Retained dispatch')).toBeTruthy()
  })
})
