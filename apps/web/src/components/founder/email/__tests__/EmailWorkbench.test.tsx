import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Isolate EmailWorkbench's load/error logic from its children.
vi.mock('../AccountTabs', () => ({ AccountTabs: () => <div data-testid="account-tabs" /> }))
vi.mock('../ThreadList', () => ({ ThreadList: () => <div data-testid="thread-list" /> }))
vi.mock('../ThreadViewer', () => ({ ThreadViewer: () => <div /> }))
vi.mock('../BulkActionBar', () => ({ BulkActionBar: () => <div /> }))
vi.mock('../ReauthBanner', () => ({ ReauthBanner: () => <div /> }))

import { EmailWorkbench } from '../EmailWorkbench'

// Minimal connected (non-reauth) account.
const account = { email: 'founder@test.com', needsReauth: false } as never

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('EmailWorkbench honest error state', () => {
  it('renders an honest error state when threads fail to load — never a fake empty inbox', async () => {
    global.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      if (String(url).includes('/api/email/threads')) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response)
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response)
    })

    render(<EmailWorkbench accounts={[account]} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.getByText(/inbox unavailable/i)).toBeDefined()
    // No-Invaders #1: a failed load must NOT fall through to the thread list.
    expect(screen.queryByTestId('thread-list')).toBeNull()
  })

  it('does not show the error state on a successful (empty) load', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ threads: [] }),
    } as Response)

    render(<EmailWorkbench accounts={[account]} />)

    await waitFor(() => {
      expect(screen.getByTestId('thread-list')).toBeDefined()
    })
    expect(screen.queryByText(/inbox unavailable/i)).toBeNull()
  })
})
