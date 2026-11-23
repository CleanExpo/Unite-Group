import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NotificationBell } from '../NotificationBell'

// UNI-2500: a failed poll must not leave the retained unread count presented as
// current fact. The VISIBLE half (button label, closed-bell badge, header count,
// notice, marked list) and the INERT half (no mark-as-read over a stale row) are
// asserted here; the shared stale-read sweep drives the same bell through
// success -> failed poll -> in-flight -> recovery.

const unreadRow = {
  id: 'notice-1',
  type: 'mission_update',
  payload: { message: 'Your mission needs a decision' },
  read: false,
  read_at: null,
  created_at: '2026-09-05T00:00:00Z',
}
const ok = (body: unknown) => Promise.resolve({ ok: true, json: async () => body } as unknown as Response)

/** Capture the bell's 60 s poll instead of scheduling it, so the second read is driven by the test. */
function capturePoll(): { fire: () => Promise<void> } {
  const polls: Array<() => void> = []
  const real = globalThis.setInterval
  vi.spyOn(globalThis, 'setInterval').mockImplementation(((cb: TimerHandler, ms?: number, ...rest: unknown[]) => {
    if (typeof cb === 'function' && typeof ms === 'number' && ms >= 1000) {
      polls.push(cb as () => void)
      return 0 as unknown as ReturnType<typeof setInterval>
    }
    return (real as unknown as (...a: unknown[]) => ReturnType<typeof setInterval>)(cb, ms, ...rest)
  }) as never)
  return {
    fire: async () => {
      expect(polls.length, 'the bell registered no poll').toBeGreaterThan(0)
      await act(async () => {
        for (const poll of [...polls]) poll()
      })
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function bellButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('button[aria-controls]') as HTMLButtonElement
}

describe('NotificationBell stale read (UNI-2500)', () => {
  it('a healthy poll shows the real count as current, with no stale mark', async () => {
    const poll = capturePoll()
    vi.stubGlobal('fetch', vi.fn(() => ok({ notifications: [unreadRow], unreadCount: 3 })))
    const { container } = render(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications — 3 unread' })
    await poll.fire()
    expect(bellButton(container).getAttribute('aria-label')).toBe('Notifications — 3 unread')
    expect(bellButton(container).textContent).toBe('3')
    fireEvent.click(bellButton(container))
    expect(await screen.findByText('3 unread')).toBeInTheDocument()
    expect(container.querySelector('[data-stale-read="true"]')).toBeNull()
    expect(container.querySelector('[data-stale-read-notice="true"]')).toBeNull()
    expect(screen.getByRole('button', { name: /^Mark as read: / })).not.toBeDisabled()
  })

  it('after a failed poll the label, badge and header count say "last known", and the count sits inside the marked region', async () => {
    const poll = capturePoll()
    const fetchMock = vi.fn(() => ok({ notifications: [unreadRow], unreadCount: 3 }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications — 3 unread' })
    fireEvent.click(bellButton(container))
    await screen.findByText('Your mission needs a decision')

    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')))
    await poll.fire()

    await waitFor(() =>
      expect(
        bellButton(container).getAttribute('aria-label'),
        'the bell button still announced a retained count as current',
      ).toBe('Notifications — last known 3 unread, latest read failed'),
    )
    // Closed-bell signal: no number that reads as a live count.
    expect(bellButton(container).textContent, 'the badge still shows a retained count as current').not.toMatch(/\d/)
    expect(bellButton(container).textContent).toBe('!')

    const count = screen.getByText('last known 3 unread')
    expect(count.closest('[data-stale-read="true"]'), 'the header count sits outside the stale-marked region').not.toBeNull()
    expect(screen.queryByText('3 unread'), 'the dropdown header still presented a retained count as a current fact').toBeNull()
    expect(container.querySelector('[data-stale-read-notice="true"]')).not.toBeNull()
    expect(screen.getByText('Your mission needs a decision').closest('[data-stale-read="true"]')).not.toBeNull()
  })

  it('keeps the stale mark while a replacement read is still in flight', async () => {
    const poll = capturePoll()
    const fetchMock = vi.fn(() => ok({ notifications: [unreadRow], unreadCount: 3 }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications — 3 unread' })
    fireEvent.click(bellButton(container))
    await screen.findByText('Your mission needs a decision')
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')))
    await poll.fire()
    await waitFor(() => expect(container.querySelector('[data-stale-read="true"]')).not.toBeNull())

    // A read that has not finished has not succeeded: nothing on screen is current yet.
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    await poll.fire()
    expect(
      bellButton(container).getAttribute('aria-label'),
      'the stale mark dropped as soon as a replacement read started',
    ).toBe('Notifications — last known 3 unread, latest read failed')
    expect(container.querySelector('[data-stale-read="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: /^Mark as read: / })).toBeDisabled()
  })

  it('marks the count stale even when the retained list has no rows', async () => {
    const poll = capturePoll()
    const fetchMock = vi.fn(() => ok({ notifications: [], unreadCount: 2 }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications — 2 unread' })
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')))
    await poll.fire()
    await waitFor(() =>
      expect(bellButton(container).getAttribute('aria-label')).toBe('Notifications — last known 2 unread, latest read failed'),
    )
    fireEvent.click(bellButton(container))
    expect(screen.getByText('last known 2 unread').closest('[data-stale-read="true"]')).not.toBeNull()
    expect(container.querySelector('[data-stale-read-notice="true"]')).not.toBeNull()
  })

  it('a stale row cannot be marked as read; a recovered read makes it actionable again', async () => {
    const poll = capturePoll()
    const fetchMock = vi.fn((url: string) =>
      url.includes('/read') ? ok({ success: true }) : ok({ notifications: [unreadRow], unreadCount: 1 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications — 1 unread' })
    fireEvent.click(bellButton(container))
    await screen.findByText('Your mission needs a decision')

    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')))
    await poll.fire()
    await waitFor(() => expect(container.querySelector('[data-stale-read="true"]')).not.toBeNull())

    const row = screen.getByRole('button', { name: /^Mark as read: / })
    expect(row, 'mark-as-read stayed live over a row from a read that has since failed').toBeDisabled()
    fireEvent.click(screen.getByText('Your mission needs a decision'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/read')),
      'a stale row fired PATCH /api/notifications/{id}/read',
    ).toBe(false)

    // Recovery: the next poll succeeds, the mark clears and the row acts again.
    fetchMock.mockImplementation((url: string) =>
      url.includes('/read') ? ok({ success: true }) : ok({ notifications: [unreadRow], unreadCount: 1 }),
    )
    await poll.fire()
    await waitFor(() => expect(container.querySelector('[data-stale-read="true"]')).toBeNull())
    expect(bellButton(container).getAttribute('aria-label')).toBe('Notifications — 1 unread')
    const live = screen.getByRole('button', { name: /^Mark as read: / })
    expect(live).not.toBeDisabled()
    fireEvent.click(live)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/notifications/notice-1/read', { method: 'PATCH' }))
  })

  it('a first read that fails says so on the closed bell instead of reading as an empty inbox', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))))
    const { container } = render(<NotificationBell />)
    await waitFor(() => expect(bellButton(container).getAttribute('aria-label')).toBe('Notifications — latest read failed'))
    expect(bellButton(container).textContent).toBe('!')
    expect(container.querySelector('[data-stale-read="true"]')).toBeNull()
  })
})
