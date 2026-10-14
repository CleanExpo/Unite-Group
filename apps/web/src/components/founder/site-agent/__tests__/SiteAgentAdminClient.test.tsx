/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SiteAgentAdminClient } from '../SiteAgentAdminClient'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function resp(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body } as Response)
}

const KEY = 'sk_site_abcdefghijklmnopqrstuvwxyz012345'
const state = (overrides: Record<string, unknown> = {}) => ({
  day: '2026-10-14',
  businesses: { status: 'ok', data: [{ id: 'b1', name: 'Acme Plumbing', slug: 'acme' }] },
  keys: {
    status: 'ok',
    data: [
      {
        id: 'k1',
        business_key: 'acme',
        publishable_key: KEY,
        allowed_origins: ['https://acme.example'],
        active: true,
        created_at: '2026-10-14T00:00:00Z',
      },
    ],
  },
  controls: { status: 'ok', data: null },
  usage: { status: 'ok', data: [{ scope: `key:${KEY}`, kind: 'chat', count: 7 }] },
  ...overrides,
})

describe('SiteAgentAdminClient', () => {
  it('shows each key with its usage, origins and embed snippet, and a paused agent', async () => {
    fetchMock.mockReturnValue(resp(state()))
    render(<SiteAgentAdminClient />)

    expect(await screen.findByText(/Acme Plumbing · Active/)).toBeTruthy()
    expect(screen.getByText(new RegExp(`chats today: 7`))).toBeTruthy()
    expect(screen.getByDisplayValue('https://acme.example')).toBeTruthy()
    expect(screen.getByText(new RegExp(`data-site-key="${KEY}"`))).toBeTruthy()
    expect(screen.getByText(/Paused — no controls row yet/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn agent on' })).toBeTruthy()
  })

  it('renders a failed read as an error, not as zero usage or no keys', async () => {
    fetchMock.mockReturnValue(
      resp(
        state({
          keys: { status: 'error', error: 'Site keys unavailable' },
          usage: { status: 'error', error: 'Usage unavailable' },
        }),
      ),
    )
    render(<SiteAgentAdminClient />)

    expect(await screen.findByText(/Site keys: Site keys unavailable/)).toBeTruthy()
    expect(screen.getByText(/Usage: Usage unavailable/)).toBeTruthy()
    expect(screen.getByText(/unavailable chats/)).toBeTruthy()
    expect(screen.queryByText(/No site keys yet/)).toBeNull()
  })

  it('cannot apply a plan whose ceiling the founder has not set', async () => {
    fetchMock.mockReturnValue(resp(state()))
    render(<SiteAgentAdminClient />)
    await screen.findByText(/Acme Plumbing/)

    await userEvent.selectOptions(screen.getByRole('combobox'), 'growth')
    expect((screen.getByRole('button', { name: 'Apply plan ceiling' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('posts create_site with parsed origins and surfaces a server refusal', async () => {
    fetchMock
      .mockReturnValueOnce(resp(state()))
      .mockReturnValueOnce(resp({ error: 'Invalid site-agent action' }, false, 400))
    render(<SiteAgentAdminClient />)
    await screen.findByText(/Acme Plumbing/)

    await userEvent.type(screen.getByLabelText('Business name'), 'Beta Roofing')
    await userEvent.type(screen.getByLabelText(/^Slug/), 'beta-roofing')
    await userEvent.type(screen.getByLabelText(/at least one/), 'https://beta.example')
    await userEvent.click(screen.getByRole('button', { name: 'Create site key' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'create_site',
      businessName: 'Beta Roofing',
      businessSlug: 'beta-roofing',
      allowedOrigins: ['https://beta.example'],
    })
    expect(await screen.findByText(/Last action failed: Invalid site-agent action/)).toBeTruthy()
  })
})
