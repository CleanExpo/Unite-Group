import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NotificationBell } from '../NotificationBell'

const notification = { id: 'notice-1', type: 'mission_update', payload: { message: 'Your mission needs a decision' }, read: false, read_at: null, created_at: '2026-09-05T00:00:00Z' }
const response = (body: unknown, ok = true) => ({ ok, json: async () => body })
beforeEach(() => vi.restoreAllMocks())

describe('NotificationBell source states', () => {
  it('shows unavailable and retry after 503 instead of claiming an empty inbox', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ error: 'Notifications are unavailable here.' }, false)).mockResolvedValueOnce(response({ notifications: [], unreadCount: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<NotificationBell />)
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Notifications are unavailable here.')
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry notifications' }))
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
  })
  it('retains unread data and reports a failed mark-read action without claiming it was saved', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ notifications: [notification], unreadCount: 1 })).mockResolvedValueOnce(response({ error: 'Read state could not be saved.' }, false))
    vi.stubGlobal('fetch', fetchMock)
    render(<NotificationBell />)
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications — 1 unread' }))
    fireEvent.click(screen.getByText('Your mission needs a decision'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Read state could not be saved.')
    expect(screen.getByRole('button', { name: 'Notifications — 1 unread' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/notifications/notice-1/read', { method: 'PATCH' })
  })
  it('refreshes unread count only after the actual read action succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ notifications: [notification], unreadCount: 1 })).mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(response({ notifications: [{ ...notification, read: true }], unreadCount: 0 })))
    render(<NotificationBell />)
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications — 1 unread' }))
    fireEvent.click(screen.getByText('Your mission needs a decision'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications', exact: true })).toBeInTheDocument())
    expect(screen.getByText('Your mission needs a decision')).toBeInTheDocument()
  })
  it('distinguishes an unreadable response from a valid empty list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ notifications: 'not an array' })))
    render(<NotificationBell />)
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Notifications returned an unreadable response.')
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument()
  })
  it('keeps a popup opened near the left edge inside the available mobile workspace', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ notifications: [], unreadCount: 0 })))
    const { container } = render(<main><NotificationBell /></main>)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390)
    const wrapper = container.querySelector('main > div')!
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ left: 160, right: 180, top: 100, bottom: 120, width: 20, height: 20 } as DOMRect)
    vi.spyOn(container.querySelector('main')!, 'getBoundingClientRect').mockReturnValue({ left: 48, right: 390, top: 0, bottom: 844, width: 342, height: 844 } as DOMRect)
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    const popup = await screen.findByRole('dialog', { name: 'Notifications' })
    const left = 160 + Number.parseFloat(popup.style.left)
    const width = Number.parseFloat(popup.style.width)
    expect(left).toBeGreaterThanOrEqual(56)
    expect(left + width).toBeLessThanOrEqual(382)
  })
})
