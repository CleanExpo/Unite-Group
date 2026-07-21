import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { EmailIntegrationsSection } from '../EmailIntegrationsSection'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EmailIntegrationsSection (UNI-2153)', () => {
  it('shows a working Connect Google link, defaulted to the founder session email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          google: { configured: true, accounts: [] },
          microsoft: { configured: false, accounts: [] },
        }),
      }),
    )

    render(<EmailIntegrationsSection founderEmail="phill@disasterrecovery.com.au" />)

    const connectGoogle = await screen.findByRole('link', { name: /connect google/i })
    expect(connectGoogle).toHaveAttribute(
      'href',
      '/api/auth/google/authorize?email=phill%40disasterrecovery.com.au',
    )
  })

  it('lists every connected Google account with a status badge and a per-account Reconnect link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          google: {
            configured: true,
            accounts: [
              { email: 'phill@disasterrecovery.com.au', label: 'DR Gmail', needsReauth: false },
              { email: 'phill@nrpg.com.au', label: 'NRPG Gmail', needsReauth: true },
              { email: 'phill.mcgurk@gmail.com', label: 'Personal', needsReauth: false },
            ],
          },
          microsoft: { configured: false, accounts: [] },
        }),
      }),
    )

    render(<EmailIntegrationsSection founderEmail="phill@disasterrecovery.com.au" />)

    // all three mailboxes are listed — not just the first
    await waitFor(() => {
      expect(screen.getByText('phill@nrpg.com.au')).toBeInTheDocument()
    })
    expect(screen.getByText('phill@disasterrecovery.com.au')).toBeInTheDocument()
    expect(screen.getByText('phill.mcgurk@gmail.com')).toBeInTheDocument()

    // per-account status badges
    expect(screen.getByText(/needs reauth/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^connected$/i)).toHaveLength(2)

    // each account gets its own Reconnect link targeting that mailbox
    const reconnects = screen.getAllByRole('link', { name: /reconnect/i })
    expect(reconnects).toHaveLength(3)
    expect(reconnects[1]).toHaveAttribute(
      'href',
      '/api/auth/google/authorize?email=phill%40nrpg.com.au',
    )

    // once accounts exist, the connect CTA reads as "add another"
    expect(screen.getByRole('link', { name: /add another google account/i })).toBeInTheDocument()
    expect(screen.getByText(/^add another account$/i)).toBeInTheDocument()
  })

  it('disconnects a single account and refreshes the list', async () => {
    const twoAccounts = {
      google: {
        configured: true,
        accounts: [
          { email: 'keep@disasterrecovery.com.au', label: 'DR', needsReauth: false },
          { email: 'drop@gmail.com', label: 'Old', needsReauth: false },
        ],
      },
      microsoft: { configured: false, accounts: [] },
    }
    const afterDrop = {
      google: {
        configured: true,
        accounts: [{ email: 'keep@disasterrecovery.com.au', label: 'DR', needsReauth: false }],
      },
      microsoft: { configured: false, accounts: [] },
    }

    const fetchMock = vi
      .fn()
      // initial status load
      .mockResolvedValueOnce({ ok: true, json: async () => twoAccounts })
      // disconnect POST
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
      // status reload after disconnect
      .mockResolvedValueOnce({ ok: true, json: async () => afterDrop })
    vi.stubGlobal('fetch', fetchMock)

    render(<EmailIntegrationsSection founderEmail="keep@disasterrecovery.com.au" />)

    await waitFor(() => {
      expect(screen.getByText('drop@gmail.com')).toBeInTheDocument()
    })

    const dropRow = screen.getByText('drop@gmail.com').closest('li') as HTMLElement
    await userEvent.click(within(dropRow).getByRole('button', { name: 'Disconnect drop@gmail.com' }))
    // confirm step required before the delete fires
    await userEvent.click(within(dropRow).getByRole('button', { name: 'Confirm remove drop@gmail.com' }))

    // POST hit the disconnect endpoint with the exact mailbox
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/integrations/disconnect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ service: 'google', email: 'drop@gmail.com' }),
        }),
      )
    })

    // list refreshed — dropped account gone, kept account remains
    await waitFor(() => {
      expect(screen.queryByText('drop@gmail.com')).not.toBeInTheDocument()
    })
    expect(screen.getByText('keep@disasterrecovery.com.au')).toBeInTheDocument()
  })

  it('requires a confirm step: clicking Disconnect alone does not fire the delete, and Cancel aborts it', async () => {
    const twoAccounts = {
      google: {
        configured: true,
        accounts: [
          { email: 'keep@disasterrecovery.com.au', label: 'DR', needsReauth: false },
          { email: 'drop@gmail.com', label: 'Old', needsReauth: false },
        ],
      },
      microsoft: { configured: false, accounts: [] },
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => twoAccounts })
    vi.stubGlobal('fetch', fetchMock)

    render(<EmailIntegrationsSection founderEmail="keep@disasterrecovery.com.au" />)

    await waitFor(() => {
      expect(screen.getByText('drop@gmail.com')).toBeInTheDocument()
    })
    // exactly one fetch so far: the initial status load
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const dropRow = screen.getByText('drop@gmail.com').closest('li') as HTMLElement
    await userEvent.click(within(dropRow).getByRole('button', { name: 'Disconnect drop@gmail.com' }))

    // the destructive endpoint has NOT been hit — only the confirm affordance appeared
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(within(dropRow).getByText(/confirm remove drop@gmail.com\?/i)).toBeInTheDocument()

    // Cancel aborts without any delete
    await userEvent.click(within(dropRow).getByRole('button', { name: 'Cancel removing drop@gmail.com' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/settings/integrations/disconnect',
      expect.anything(),
    )
    // back to the resting Disconnect control
    expect(within(dropRow).getByRole('button', { name: 'Disconnect drop@gmail.com' })).toBeInTheDocument()
  })

  it('gives every per-account Disconnect and Reconnect control an aria-label naming its mailbox', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          google: {
            configured: true,
            accounts: [
              { email: 'drop@gmail.com', label: 'Old', needsReauth: false },
              { email: 'keep@disasterrecovery.com.au', label: 'DR', needsReauth: false },
            ],
          },
          microsoft: { configured: false, accounts: [] },
        }),
      }),
    )

    render(<EmailIntegrationsSection founderEmail="keep@disasterrecovery.com.au" />)

    await waitFor(() => {
      expect(screen.getByText('drop@gmail.com')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Disconnect drop@gmail.com' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect keep@disasterrecovery.com.au' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reconnect drop@gmail.com' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reconnect keep@disasterrecovery.com.au' })).toBeInTheDocument()
  })

  it('disables sibling controls while a disconnect is in flight', async () => {
    const twoAccounts = {
      google: {
        configured: true,
        accounts: [
          { email: 'keep@disasterrecovery.com.au', label: 'DR', needsReauth: false },
          { email: 'drop@gmail.com', label: 'Old', needsReauth: false },
        ],
      },
      microsoft: { configured: false, accounts: [] },
    }

    // hold the disconnect POST open so the in-flight state persists during assertions
    let releasePost: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {}
    const pendingPost = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
      releasePost = resolve
    })

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/settings/integrations/disconnect') return pendingPost
      return Promise.resolve({ ok: true, json: async () => twoAccounts })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EmailIntegrationsSection founderEmail="keep@disasterrecovery.com.au" />)

    await waitFor(() => {
      expect(screen.getByText('drop@gmail.com')).toBeInTheDocument()
    })

    const dropRow = screen.getByText('drop@gmail.com').closest('li') as HTMLElement
    await userEvent.click(within(dropRow).getByRole('button', { name: 'Disconnect drop@gmail.com' }))
    await userEvent.click(within(dropRow).getByRole('button', { name: 'Confirm remove drop@gmail.com' }))

    // in-flight: the sibling row's Disconnect is disabled and its row shows removing/busy
    await waitFor(() => {
      expect(dropRow).toHaveAttribute('aria-busy', 'true')
    })
    const siblingDisconnect = screen.getByRole('button', {
      name: 'Disconnect keep@disasterrecovery.com.au',
    })
    expect(siblingDisconnect).toBeDisabled()
    const siblingReconnect = screen.getByRole('link', {
      name: 'Reconnect keep@disasterrecovery.com.au',
    })
    expect(siblingReconnect).toHaveAttribute('aria-disabled', 'true')

    // let the request finish and the list settle so no state update escapes the test
    releasePost({ ok: true, json: async () => ({ success: true }) })
    await waitFor(() => {
      expect(dropRow).not.toHaveAttribute('aria-busy', 'true')
    })
  })

  it('disables the Microsoft connect button with an explanatory note when not configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          google: { configured: true, accounts: [] },
          microsoft: { configured: false, accounts: [] },
        }),
      }),
    )

    render(<EmailIntegrationsSection founderEmail="phill@disasterrecovery.com.au" />)

    const connectMicrosoft = await screen.findByRole('button', { name: /connect microsoft/i })
    expect(connectMicrosoft).toBeDisabled()
    expect(screen.getByText(/microsoft oauth is not configured on this deployment/i)).toBeInTheDocument()
  })

  it('surfaces a visible error when the status fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    render(<EmailIntegrationsSection founderEmail="phill@disasterrecovery.com.au" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
