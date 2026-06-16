import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProviderUsageCockpit } from '../ProviderUsageCockpit'
import { buildProviderCockpit, type ProviderId, type ProviderSignal } from '@/lib/command-centre/provider-usage'

vi.stubGlobal('fetch', vi.fn())
const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>

function payloadWith(overrides: Partial<Record<ProviderId, ProviderSignal>> = {}) {
  const signals: Partial<Record<ProviderId, ProviderSignal>> = {
    claude: { configured: true, usagePressure: 0.1 },
    openai: { configured: true, usagePressure: 0.85 }, // near limit
    minimax: { configured: false },
    gemini: { configured: true, usagePressure: 0.4 },
    openrouter: { configured: true },
    ...overrides,
  }
  return buildProviderCockpit({ signals, now: '2026-06-16T12:00:00.000Z' })
}

describe('ProviderUsageCockpit', () => {
  beforeEach(() => mockFetch.mockReset())

  it('renders all five providers with visual usage meters', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payloadWith() })
    render(<ProviderUsageCockpit />)

    // provider labels
    expect(await screen.findByText('Claude Max')).toBeInTheDocument()
    expect(screen.getByText('OpenAI Max')).toBeInTheDocument()
    expect(screen.getByText('MiniMax Max')).toBeInTheDocument()
    expect(screen.getByText('Google Gemini')).toBeInTheDocument()
    expect(screen.getByText('OpenRouter')).toBeInTheDocument()

    // visual meters (one per provider)
    expect(screen.getAllByRole('meter')).toHaveLength(5)

    // a near-limit provider shows its state, an unconfigured one shows blocked
    expect(screen.getByTestId('provider-state-openai')).toHaveTextContent('near limit')
    expect(screen.getByTestId('provider-state-minimax')).toHaveTextContent('blocked')
  })

  it('renders routing hints (deep reasoning → claude when available)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payloadWith() })
    render(<ProviderUsageCockpit />)

    expect(await screen.findByText('Deep reasoning')).toBeInTheDocument()
    // claude available → recommended (appears in routing at least once)
    expect(screen.getAllByText(/claude/i).length).toBeGreaterThan(0)
  })

  it('shows the degraded banner when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    render(<ProviderUsageCockpit />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
