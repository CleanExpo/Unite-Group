import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch so the board resolves past the loading skeleton
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      columns: { today: [], hot: [], pipeline: [], someday: [], done: [] },
      stateMap: {},
    }),
  } as unknown as Response)
})

// Mock dnd-kit — JSDOM doesn't support pointer events or drag.
//
// The mock now CAPTURES `onDragEnd` instead of discarding it. Previously
// `DndContext` rendered its children and dropped every prop, so `handleDragEnd`
// was unreachable from any test in this file — stated openly in the source, and
// named by a release round as a coverage gap (UNI-2499). It stopped being
// theoretical when round 14 found a real defect living in exactly that blind
// spot: the PATCH ignored a non-OK response (UNI-2501). Capturing the handler
// does not simulate a browser drag, but it does let the drag PATH be driven.
const dnd = vi.hoisted(() => ({
  onDragEnd: null as null | ((event: unknown) => void | Promise<void>),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode
    onDragEnd?: (event: unknown) => void | Promise<void>
  }) => {
    dnd.onDragEnd = onDragEnd ?? null
    return <>{children}</>
  },
  DragOverlay: () => null,
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}))

import { KanbanBoard } from '../KanbanBoard'

describe('KanbanBoard', () => {
  it('renders 5 column headers', async () => {
    render(<KanbanBoard />)
    await waitFor(() => expect(screen.getByText('TODAY')).toBeInTheDocument())
    expect(screen.getByText('HOT')).toBeInTheDocument()
    expect(screen.getByText('PIPELINE')).toBeInTheDocument()
    expect(screen.getByText('SOMEDAY')).toBeInTheDocument()
    expect(screen.getByText('DONE')).toBeInTheDocument()
  })

  it('proposes CRM tasks without refreshing or mutating the Linear projection', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          columns: { today: [], hot: [], pipeline: [], someday: [], done: [] },
          stateMap: {},
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          createdCount: 2,
          skippedExistingCount: 0,
          failedCount: 0,
          partial: false,
        }),
      } as unknown as Response)

    render(<KanbanBoard />)
    const proposeButtons = await screen.findAllByRole('button', { name: 'Propose' })
    fireEvent.click(proposeButtons[0])

    await screen.findByText(
      'Created 2 CRM proposals for review — nothing was queued or sent to Hermes or Linear.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/kanban/generate-next',
      expect.objectContaining({ method: 'POST' }),
    ])
  })

  // A failed RELOAD keeps the cached cards on screen — deliberate, and the
  // "Linear unreachable — showing cached data" banner says so. What was missing
  // is the machine-readable half: no `data-stale-read` region and no
  // `StaleReadNotice`, so no census could see this surface at all. [UNI-2494]
  //
  // LIMIT, stated so this green is not read as more than it is: the INERT half
  // — `handleDragEnd` returning early instead of PATCHing — is NOT exercised
  // here. dnd-kit is mocked at the top of this file and `DndContext` renders its
  // children without ever invoking `onDragEnd`, so no test in this file can
  // reach the drag path. That guard is asserted by reading only.
  it('marks the retained board after a FAILED reload', async () => {
    const originalSetInterval = globalThis.setInterval
    const polls: Array<() => void> = []
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((
      cb: TimerHandler,
      ms?: number,
      ...rest: unknown[]
    ) => {
      if (typeof cb === 'function' && typeof ms === 'number' && ms >= 1000) {
        polls.push(cb as () => void)
        return 0 as unknown as ReturnType<typeof setInterval>
      }
      return (originalSetInterval as unknown as (...a: unknown[]) => ReturnType<typeof setInterval>)(
        cb,
        ms,
        ...rest,
      )
    }) as never)

    const card = {
      id: 'c1',
      title: 'UNI-1 — Retained card',
      businessKey: 'dr',
      businessColor: '#16a34a',
      teamKey: 'UNI',
      stateId: 's1',
    }
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: { today: [card], hot: [], pipeline: [], someday: [], done: [] },
        stateMap: {},
        configured: true,
      }),
    } as unknown as Response)

    render(<KanbanBoard />)
    await screen.findByText(/Retained card/)
    expect(
      document.querySelector('[data-stale-read="true"]'),
      'marked a SUCCESSFUL read as stale',
    ).toBeNull()

    const proposeAfterGoodRead = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Propose',
    ) as HTMLButtonElement | undefined
    expect(proposeAfterGoodRead, 'no Propose control after a good read').toBeTruthy()
    expect(proposeAfterGoodRead?.disabled, 'disabled Propose after a SUCCESSFUL read').toBe(false)

    // The board polls every 60s; the captured poll is the reload trigger.
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    expect(polls.length, 'the board registered no poll to fire').toBeGreaterThan(0)
    await act(async () => {
      for (const poll of [...polls]) poll()
    })

    await waitFor(() =>
      expect(
        document.querySelector('[data-stale-read="true"]'),
        'kept the cached cards after a FAILED reload without marking them stale',
      ).not.toBeNull(),
    )
    expect(
      document.querySelector('[data-stale-read-notice="true"]'),
      'marked the region but told the founder nothing',
    ).not.toBeNull()
    // Retained, not deleted — the contract asks for it to be MARKED.
    expect(screen.getByText(/Retained card/)).toBeTruthy()

    // ...and Propose goes offline. It builds `existingTitles` from the retained
    // cards and POSTs /api/kanban/generate-next, so leaving it live generates
    // work from a board the latest read could not confirm. [UNI-2495]
    const propose = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Propose',
    ) as HTMLButtonElement | undefined
    expect(propose, 'lost the Propose control entirely').toBeTruthy()
    expect(
      propose?.disabled,
      'left Propose live on a stale board — it POSTs from retained cards',
    ).toBe(true)

    vi.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // UNI-2501. Both defects below were found by round 14 at a head that round 13
  // had just PASSED — same blob, different sample of the same reviewer. They are
  // pinned here so the next verdict does not depend on which sample looks.
  // ───────────────────────────────────────────────────────────────────────────

  const CARD = {
    id: 'c1',
    title: 'UNI-1 — Retained card',
    businessKey: 'dr',
    businessColor: '#16a34a',
    teamKey: 'UNI',
    stateId: 's1',
  }
  const EMPTY_BOARD = {
    columns: { today: [], hot: [], pipeline: [], someday: [], done: [] },
    stateMap: {},
    configured: true,
  }

  /** Capture the board's 60s poll instead of scheduling it. */
  function capturePolls() {
    const polls: Array<() => void> = []
    const realSetInterval = globalThis.setInterval
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((
      cb: TimerHandler,
      ms?: number,
      ...rest: unknown[]
    ) => {
      if (typeof cb === 'function' && typeof ms === 'number' && ms >= 1000) {
        polls.push(cb as () => void)
        return 0 as unknown as ReturnType<typeof setInterval>
      }
      return (realSetInterval as unknown as (...a: unknown[]) => ReturnType<typeof setInterval>)(
        cb,
        ms,
        ...rest,
      )
    }) as never)
    return polls
  }

  it('marks a GENUINELY EMPTY board stale after a failed reload, and takes Propose offline', async () => {
    const polls = capturePolls()
    const fetchMock = vi.mocked(global.fetch)
    // A successful read that found nothing. "No issues" is now a FACT.
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => EMPTY_BOARD } as unknown as Response)

    render(<KanbanBoard />)
    await waitFor(() => expect(screen.getByText('TODAY')).toBeInTheDocument())
    expect(document.querySelector('[data-stale-read="true"]')).toBeNull()

    // ...and the reload fails, so that fact is no longer confirmed.
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    expect(polls.length, 'the board registered no poll to fire').toBeGreaterThan(0)
    await act(async () => {
      for (const poll of [...polls]) poll()
    })

    // THE ASSERTION THIS BOARD FAILED. `staleRead` required a retained CARD, so
    // an empty board could never be marked, and Propose stayed live to generate
    // work from a board the latest read could not confirm.
    await waitFor(() =>
      expect(
        document.querySelector('[data-stale-read="true"]'),
        'an empty board retained across a failed reload was never marked stale',
      ).not.toBeNull(),
    )
    expect(document.querySelector('[data-stale-read-notice="true"]')).not.toBeNull()

    const propose = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Propose',
    ) as HTMLButtonElement | undefined
    expect(propose?.disabled, 'left Propose live on a stale EMPTY board').toBe(true)

    vi.restoreAllMocks()
  })

  // NEGATIVE CONTROL for the above. Without it, "always stale when `stale`"
  // would satisfy that test while claiming a cache that does not exist.
  it('a FIRST read that never landed is not called cached data', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockRejectedValueOnce(new Error('network down'))

    render(<KanbanBoard />)

    await waitFor(() =>
      expect(screen.getByText(/could not be read/i)).toBeInTheDocument(),
    )
    // Nothing was ever retained, so there is nothing to mark as retained.
    expect(
      screen.queryByText(/showing cached data/i),
      'claimed to be showing cached data after a read that never succeeded',
    ).toBeNull()
    expect(document.querySelector('[data-stale-read="true"]')).toBeNull()

    vi.restoreAllMocks()
  })

  it('a drag whose PATCH is REJECTED does not leave the move on screen', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: { today: [CARD], hot: [], pipeline: [], someday: [], done: [] },
        stateMap: {},
        configured: true,
      }),
    } as unknown as Response)

    render(<KanbanBoard />)
    await screen.findByText(/Retained card/)
    expect(dnd.onDragEnd, 'DndContext never received an onDragEnd handler').toBeTruthy()

    const callsBefore = fetchMock.mock.calls.length
    // 503 is what THIS BRANCH taught the route to answer when Linear is
    // unconfigured. A Response, not a throw — the old catch never saw it.
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as unknown as Response)
    // ...and the revert re-read that must follow it.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: { today: [CARD], hot: [], pipeline: [], someday: [], done: [] },
        stateMap: {},
        configured: true,
      }),
    } as unknown as Response)

    await act(async () => {
      await dnd.onDragEnd?.({ active: { id: 'c1' }, over: { id: 'hot' } })
    })

    // THE ASSERTION THIS BOARD FAILED. The PATCH was awaited without reading
    // `res.ok`, so a rejected write was rendered as a completed move: two calls
    // (the PATCH and nothing else) instead of three (PATCH then re-read).
    expect(
      fetchMock.mock.calls.length - callsBefore,
      'a rejected PATCH was treated as success — no revert read followed it',
    ).toBe(2)
    const urls = fetchMock.mock.calls.slice(callsBefore).map((c) => String(c[0]))
    expect(urls[0]).toContain('/api/linear/issues')
    expect(urls[1]).toContain('/api/linear/issues')

    vi.restoreAllMocks()
  })

  /**
   * The INERT half of UNI-2494, finally reachable.
   *
   * `if (staleRead) return` in handleDragEnd is the guard that ticket exists for
   * — it stops a retained card being PATCHed to Linear on the strength of a read
   * that has since failed. No test in this file could reach it, because the
   * mocked DndContext dropped `onDragEnd`, so the guard has been asserted BY
   * READING ONLY since it was written.
   *
   * Capturing the handler for the PATCH tests above made this testable, and
   * leaving it untested to keep a review plant strong would be preserving a hole
   * on purpose. The drag tests either side of this one run on a HEALTHY board;
   * this is the only one that drags a stale one.
   */
  it('a drag on a STALE board issues no PATCH at all', async () => {
    const polls = capturePolls()
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: { today: [CARD], hot: [], pipeline: [], someday: [], done: [] },
        stateMap: {},
        configured: true,
      }),
    } as unknown as Response)

    render(<KanbanBoard />)
    await screen.findByText(/Retained card/)

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    expect(polls.length, 'the board registered no poll to fire').toBeGreaterThan(0)
    await act(async () => {
      for (const poll of [...polls]) poll()
    })
    await waitFor(() =>
      expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull(),
    )

    const callsBefore = fetchMock.mock.calls.length
    await act(async () => {
      await dnd.onDragEnd?.({ active: { id: 'c1' }, over: { id: 'hot' } })
    })

    expect(
      fetchMock.mock.calls.length - callsBefore,
      'a retained card was dragged and PATCHed to Linear from a read that has since failed',
    ).toBe(0)

    vi.restoreAllMocks()
  })

  /**
   * An UNCONFIGURED Linear is not an empty backlog. [UNI-2493]
   *
   * The route now omits `columns` for `configured:false`, but the board coerced
   * that absence into five empty columns with every action live — the false-empty
   * class surviving at the consumer after the route stopped lying. Found by the
   * release round at 2d209caa, which probed it directly and found the
   * not-connected banner beside four enabled Propose buttons.
   */
  it('an unconfigured Linear leaves no board action live', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ configured: false, stateMap: {} }),
    } as unknown as Response)

    render(<KanbanBoard />)
    await waitFor(() => expect(screen.getByText('TODAY')).toBeInTheDocument())

    const propose = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Propose',
    ) as HTMLButtonElement[]
    expect(propose.length, 'no Propose control rendered at all').toBeGreaterThan(0)
    expect(
      propose.every((b) => b.disabled),
      'left Propose live on a board that was never read — it POSTs /api/kanban/generate-next',
    ).toBe(true)

    // No drag assertion here, deliberately. An unconfigured board has no cards,
    // so handleDragEnd exits at findColumnByCardId before reaching any guard —
    // a mutation control proved such an assertion passes whether the guard is
    // present or absent. Asserting it would have looked like coverage and been
    // worth nothing.

    vi.restoreAllMocks()
  })

  /**
   * An unconfigured response is a SUCCESSFUL request that carries no board, so a
   * later failed poll must not claim retained data. [UNI-2493]
   *
   * `hasLoadedOnce` was set for every 200, including the unconfigured one, so
   * unconfigured → failed poll wrapped a never-read empty board in
   * `data-stale-read="true"` and showed a notice promising last-known data that
   * had never been received. The inverse of the defect the flag was added to fix,
   * introduced by that fix. Found by the round at dc0d44db.
   */
  it('a failed poll after an UNCONFIGURED response claims no retained data', async () => {
    const polls = capturePolls()
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ configured: false, stateMap: {} }),
    } as unknown as Response)

    render(<KanbanBoard />)
    await waitFor(() => expect(screen.getByText('TODAY')).toBeInTheDocument())

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    expect(polls.length, 'the board registered no poll to fire').toBeGreaterThan(0)
    await act(async () => {
      for (const poll of [...polls]) poll()
    })

    expect(
      document.querySelector('[data-stale-read="true"]'),
      'marked a never-read board as retained stale data — nothing was ever received to retain',
    ).toBeNull()
    expect(
      document.querySelector('[data-stale-read-notice="true"]'),
      'promised last-known data for a board that was never read',
    ).toBeNull()

    vi.restoreAllMocks()
  })

  /**
   * Opening a retained card GETs /api/linear/issues/{id} for an id the latest
   * read could not confirm. It is an act on a retained record inside the marked
   * region — and invisible to the census detector, because a card is not a
   * <button>. [UNI-2494][UNI-2502]
   */
  it('a retained card cannot be opened while the board is stale', async () => {
    const polls = capturePolls()
    const fetchMock = vi.mocked(global.fetch)
    // TWO cards, and that is load-bearing. With one card the healthy click below
    // already selects it, so the stale click re-selects the SAME id, React sees
    // no state change and refetches nothing — the assertion then passes whether
    // the gate exists or not. A mutation control caught exactly that: removing
    // the gate left the test green. The second card makes the stale click a real
    // selection change, so the fetch would happen if nothing stopped it.
    const SECOND = { ...CARD, id: 'c2', title: 'UNI-2 — Second card' }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: { today: [CARD, SECOND], hot: [], pipeline: [], someday: [], done: [] },
        stateMap: {},
        configured: true,
      }),
    } as unknown as Response)

    render(<KanbanBoard />)
    const card = await screen.findByText(/Retained card/)

    // Healthy first: the card opens, or the assertion below proves nothing.
    // The detail response has to be shaped, not just ok — IssueDetailPanel reads
    // `issue.state.name` and maps `labels.nodes`, so a board-shaped payload
    // crashes the panel and the test would fail for the wrong reason.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'c1',
        identifier: 'UNI-1',
        title: 'Retained card',
        description: null,
        priority: 2,
        url: 'https://linear.app/x/UNI-1',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        team: { id: 't1', key: 'UNI', name: 'Unite' },
        state: { id: 's1', name: 'Todo', type: 'unstarted' },
        labels: { nodes: [] },
        businessKey: 'dr',
        businessColor: '#16a34a',
      }),
    } as unknown as Response)

    await act(async () => {
      fireEvent.click(card)
    })
    expect(
      fetchMock.mock.calls.some((c) => /\/api\/linear\/issues\/[^/?]+$/.test(String(c[0]))),
      'a card click on a HEALTHY board did not open the issue — the negative case is vacuous',
    ).toBe(true)

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await act(async () => {
      for (const poll of [...polls]) poll()
    })
    await waitFor(() =>
      expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull(),
    )

    // Scoped to the marked region: the detail panel opened by the healthy click
    // above renders the same title, so an unscoped query matches two elements.
    // The region is also the right scope on the merits — the claim is about what
    // stays live INSIDE it.
    // A valid detail response for the second card, queued but expected to go
    // UNCONSUMED. Without it the control fails by crashing IssueDetailPanel on a
    // board-shaped payload instead of failing on the assertion below — proving
    // only that something broke, not that the fetch happened.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'c2',
        identifier: 'UNI-2',
        title: 'Second card',
        description: null,
        priority: 2,
        url: 'https://linear.app/x/UNI-2',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        team: { id: 't1', key: 'UNI', name: 'Unite' },
        state: { id: 's1', name: 'Todo', type: 'unstarted' },
        labels: { nodes: [] },
        businessKey: 'dr',
        businessColor: '#16a34a',
      }),
    } as unknown as Response)

    const region = document.querySelector('[data-stale-read="true"]') as HTMLElement
    const callsBefore = fetchMock.mock.calls.length
    // The SECOND card, so this is a genuine selection change.
    await act(async () => {
      fireEvent.click(within(region).getByText(/Second card/))
    })
    expect(
      fetchMock.mock.calls.length - callsBefore,
      'clicking a retained card on a stale board still fetched the issue by an id the latest read could not confirm',
    ).toBe(0)

    vi.restoreAllMocks()
  })

  // NEGATIVE CONTROL. Without it, "always reload after a drag" would satisfy the
  // test above while throwing away every successful optimistic move.
  it('a drag whose PATCH SUCCEEDS does not trigger a revert read', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: { today: [CARD], hot: [], pipeline: [], someday: [], done: [] },
        stateMap: {},
        configured: true,
      }),
    } as unknown as Response)

    render(<KanbanBoard />)
    await screen.findByText(/Retained card/)

    const callsBefore = fetchMock.mock.calls.length
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)

    await act(async () => {
      await dnd.onDragEnd?.({ active: { id: 'c1' }, over: { id: 'hot' } })
    })

    expect(
      fetchMock.mock.calls.length - callsBefore,
      'a SUCCESSFUL move was reverted by an unnecessary re-read',
    ).toBe(1)

    vi.restoreAllMocks()
  })
})
