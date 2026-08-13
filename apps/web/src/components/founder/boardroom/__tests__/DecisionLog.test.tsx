import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { DecisionLog } from '../DecisionLog'

// Why this lives here rather than in the no-invaders census:
// `driveFixture` provokes a second read through a captured poll or a Refresh
// control. This surface has neither — it reloads only when `filterStatus`
// changes, which is the very shape the census was blind to until UNI-2488. The
// reload is driven here by clicking a filter button, which no generic fixture
// harness can do. [UNI-2489]

const DECISION = {
  id: 'dec-1',
  title: 'Retained decision',
  type: 'strategic',
  rationale: null,
  amount_aud: null,
  deadline: null,
  business_key: null,
  status: 'open',
  created_at: '2026-08-01T00:00:00Z',
}

let failing = false
let patchCalls: string[] = []

/** The status-transition control, distinguished from the filter buttons by its arrow. */
function transitionButton(): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes('→'),
  ) as HTMLButtonElement | undefined
}

describe('DecisionLog: retained decisions must be marked and inert', () => {
  beforeEach(() => {
    failing = false
    patchCalls = []
    global.fetch = vi.fn(async (url: unknown, init?: { method?: string }) => {
      if (init?.method === 'PATCH') {
        patchCalls.push(String(url))
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
      }
      if (failing) throw new Error('network down')
      return {
        ok: true,
        status: 200,
        json: async () => ({ decisions: [DECISION] }),
      } as unknown as Response
    }) as never
  })

  afterEach(() => vi.restoreAllMocks())

  // NEGATIVE CONTROL. Without it, a component that marked everything stale and
  // disabled every transition would satisfy the failure assertions perfectly.
  it('marks nothing and keeps transitions live while the read is SUCCEEDING', async () => {
    render(<DecisionLog />)
    await screen.findByText('Retained decision')

    expect(
      document.querySelector('[data-stale-read="true"]'),
      'marked a SUCCESSFUL read as stale',
    ).toBeNull()

    const button = transitionButton()
    expect(button, 'no status-transition control rendered after a good read').toBeTruthy()
    expect(button?.disabled).toBe(false)

    await act(async () => {
      fireEvent.click(button as HTMLButtonElement)
    })
    expect(patchCalls.length, 'a transition must still work on a healthy read').toBe(1)
  })

  it('marks the retained decisions and takes transitions offline after a FAILED reload', async () => {
    render(<DecisionLog />)
    await screen.findByText('Retained decision')

    // The reload is driven by a dependency change, not a poll or a Refresh
    // control: clicking a filter re-runs the effect.
    failing = true
    const openFilter = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Open',
    )
    expect(openFilter, 'no filter control to drive the reload').toBeTruthy()
    await act(async () => {
      fireEvent.click(openFilter as HTMLButtonElement)
    })

    await waitFor(() =>
      expect(
        document.querySelector('[data-stale-read="true"]'),
        'kept the previous decisions after a FAILED reload without marking them stale',
      ).not.toBeNull(),
    )
    // Marked in words, not only in an attribute.
    expect(
      document.querySelector('[data-stale-read-notice="true"]'),
      'marked the region but told the founder nothing',
    ).not.toBeNull()
    // The payload is retained — this asks for it to be MARKED, not deleted.
    expect(screen.getByText('Retained decision')).toBeTruthy()

    // ...and the retained rows must no longer act on themselves.
    const button = transitionButton()
    expect(button, 'lost the transition control entirely').toBeTruthy()
    expect(
      button?.disabled,
      'left the status transition clickable over decisions from a read that has since failed',
    ).toBe(true)

    await act(async () => {
      fireEvent.click(button as HTMLButtonElement)
    })
    expect(
      patchCalls.length,
      'a retained decision still issued PATCH /api/boardroom/decisions/{id} after a failed reload',
    ).toBe(0)
  })
})
