import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { EmailIntegrationsSection } from '../EmailIntegrationsSection'

const ACCOUNT = 'phill@disasterrecovery.com.au'

const statusPayload = {
  google: {
    configured: true,
    accounts: [{ email: ACCOUNT, label: 'DR Gmail', needsReauth: false }],
  },
  microsoft: { configured: false, accounts: [] },
}

const defaultVoice = {
  isCustom: false,
  voice: {
    name: 'Phill',
    signOff: 'Cheers, Phill',
    toneGuidelines: ['Concise.'],
    neverDo: ['Never invent facts.'],
  },
}

/**
 * Routes fetch by URL + method so the voice editor's lazy GET/PUT are isolated
 * from the account-status load. `putHandler` lets a test flip PUT to an error.
 */
function stubFetch(putHandler: () => { ok: boolean }) {
  const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
    if (input.startsWith('/api/settings/integrations/voice')) {
      if (init?.method === 'PUT') {
        return Promise.resolve({ ...putHandler(), json: async () => ({ success: true }) })
      }
      return Promise.resolve({ ok: true, json: async () => defaultVoice })
    }
    // account-status load
    return Promise.resolve({ ok: true, json: async () => statusPayload })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('EmailIntegrationsSection — copywriter voice editor (task 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fetch the voice until the editor is expanded', async () => {
    const fetchMock = stubFetch(() => ({ ok: true }))
    render(<EmailIntegrationsSection founderEmail={ACCOUNT} />)

    await waitFor(() => {
      expect(screen.getByText(ACCOUNT)).toBeInTheDocument()
    })
    // only the status load — no voice call yet
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/integrations/voice'),
      expect.anything(),
    )
  })

  it('renders the default empty state, then edits and saves the voice', async () => {
    const fetchMock = stubFetch(() => ({ ok: true }))
    render(<EmailIntegrationsSection founderEmail={ACCOUNT} />)

    await waitFor(() => {
      expect(screen.getByText(ACCOUNT)).toBeInTheDocument()
    })

    // expand the per-account voice editor
    await userEvent.click(
      screen.getByRole('button', { name: `Copywriter voice for ${ACCOUNT}` }),
    )

    // default empty state
    await waitFor(() => {
      expect(screen.getByText(/using the default voice/i)).toBeInTheDocument()
    })

    // voice GET fired for this exact account
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/settings/integrations/voice?account_email=${encodeURIComponent(ACCOUNT)}`,
    )

    // edit
    await userEvent.click(
      screen.getByRole('button', { name: `Edit copywriter voice for ${ACCOUNT}` }),
    )
    const nameInput = screen.getByRole('textbox', { name: `Voice name for ${ACCOUNT}` })
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Phill (DR)')

    // save
    await userEvent.click(
      screen.getByRole('button', { name: `Save copywriter voice for ${ACCOUNT}` }),
    )

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, init]) =>
            u === '/api/settings/integrations/voice' &&
            (init as RequestInit | undefined)?.method === 'PUT',
        ),
      ).toBe(true)
    })

    const putCall = fetchMock.mock.calls.find(
      ([u, init]) =>
        u === '/api/settings/integrations/voice' &&
        (init as RequestInit | undefined)?.method === 'PUT',
    )
    const putBody = JSON.parse((putCall![1] as RequestInit).body as string)
    expect(putBody.account_email).toBe(ACCOUNT)
    expect(putBody.name).toBe('Phill (DR)')

    // aria-live confirmation
    await waitFor(() => {
      expect(screen.getByText('Voice saved')).toBeInTheDocument()
    })
  })

  it('surfaces an error when the save fails', async () => {
    stubFetch(() => ({ ok: false }))
    render(<EmailIntegrationsSection founderEmail={ACCOUNT} />)

    await waitFor(() => {
      expect(screen.getByText(ACCOUNT)).toBeInTheDocument()
    })

    await userEvent.click(
      screen.getByRole('button', { name: `Copywriter voice for ${ACCOUNT}` }),
    )
    await waitFor(() => {
      expect(screen.getByText(/using the default voice/i)).toBeInTheDocument()
    })
    await userEvent.click(
      screen.getByRole('button', { name: `Edit copywriter voice for ${ACCOUNT}` }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: `Save copywriter voice for ${ACCOUNT}` }),
    )

    const region = screen.getByRole('region', {
      name: `Copywriter voice editor for ${ACCOUNT}`,
    })
    await waitFor(() => {
      expect(within(region).getByRole('alert')).toHaveTextContent(/failed to save voice/i)
    })
  })
})
