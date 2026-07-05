import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

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

  it('lists connected Google accounts and flags ones needing re-authorisation', async () => {
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
            ],
          },
          microsoft: { configured: false, accounts: [] },
        }),
      }),
    )

    render(<EmailIntegrationsSection founderEmail="phill@disasterrecovery.com.au" />)

    await waitFor(() => {
      expect(screen.getByText('phill@nrpg.com.au')).toBeInTheDocument()
    })
    expect(screen.getByText('phill@disasterrecovery.com.au')).toBeInTheDocument()
    expect(screen.getByText(/needs re-authorisation/i)).toBeInTheDocument()
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
