import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ConnectionStrip } from '../ConnectionStrip'
import type { SocialChannel } from '@/lib/integrations/social/types'

// A connected LinkedIn channel on Synthex (the strip's default business), so the
// disconnect button renders.
const channel: SocialChannel = {
  id: 'ch1',
  founderId: 'f1',
  platform: 'linkedin',
  businessKey: 'synthex',
  channelId: 'li-1',
  channelName: 'Synthex',
  handle: 'synthex',
  name: 'Synthex',
  followerCount: 100,
  profileImageUrl: null,
  isConnected: true,
  tokenExpiresAt: null,
  lastSyncedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ConnectionStrip — destructive disconnect (UNI-2221)', () => {
  it('confirms before disconnecting, and does not call the API when cancelled', () => {
    const confirmMock = vi.fn(() => false)
    vi.stubGlobal('confirm', confirmMock)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ConnectionStrip channels={[channel]} />)
    fireEvent.click(screen.getByTitle('Disconnect LinkedIn'))

    expect(confirmMock).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a visible error when the disconnect API fails — never console-only', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'teardown failed' }),
    }))
    // Silence the intentional console.error.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ConnectionStrip channels={[channel]} />)
    fireEvent.click(screen.getByTitle('Disconnect LinkedIn'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/could not disconnect linkedin/i)).toBeInTheDocument()
    // The channel pill must remain (not optimistically removed) on failure.
    expect(screen.getByTitle('Disconnect LinkedIn')).toBeInTheDocument()
  })

  it('removes the channel and shows no error on a successful disconnect', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) }))

    render(<ConnectionStrip channels={[channel]} />)
    fireEvent.click(screen.getByTitle('Disconnect LinkedIn'))

    await waitFor(() => {
      expect(screen.queryByTitle('Disconnect LinkedIn')).toBeNull()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
