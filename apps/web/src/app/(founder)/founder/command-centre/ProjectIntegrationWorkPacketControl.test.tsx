import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectIntegrationWorkPacketControl } from './ProjectIntegrationWorkPacketControl'

vi.stubGlobal('fetch', vi.fn())
const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>

describe('ProjectIntegrationWorkPacketControl', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('loads the manifest gap preview count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 3 }),
    })

    render(<ProjectIntegrationWorkPacketControl />)

    fireEvent.click(screen.getByRole('button', { name: /refresh manifest gap/i }))

    expect(await screen.findByText('3 gaps')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/command-centre/project-integrations/work-packets',
      expect.objectContaining({ cache: 'no-store', credentials: 'include' }),
    )
  })

  it('queues manifest gap packets into the durable work lane', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 4, queuedCount: 2, skippedExistingCount: 2 }),
    })

    render(<ProjectIntegrationWorkPacketControl />)

    fireEvent.click(screen.getByRole('button', { name: /queue manifest gap/i }))

    expect(await screen.findByText('2 queued - 2 existing')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/command-centre/project-integrations/work-packets',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ queue: true }),
        }),
      )
    })
  })

  it('shows a server error without claiming success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'registry unavailable' }),
    })

    render(<ProjectIntegrationWorkPacketControl />)

    fireEvent.click(screen.getByRole('button', { name: /queue manifest gap/i }))

    expect(await screen.findByText('registry unavailable')).toBeInTheDocument()
  })
})
