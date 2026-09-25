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
    expect(await screen.findByText('Anthropic API')).toBeInTheDocument()
    expect(screen.getByText('OpenAI API')).toBeInTheDocument()
    expect(screen.getByText('MiniMax API')).toBeInTheDocument()
    expect(screen.getByText('Gemini API')).toBeInTheDocument()
    expect(screen.getByText('OpenRouter')).toBeInTheDocument()

    // One radial gauge per metered API/credit route WITH a known usage figure
    // (claude 10, openai 85, gemini 40). Consumer Max plans are deliberately
    // not represented as callable API capacity.
    expect(screen.getAllByRole('meter')).toHaveLength(3)
    expect(screen.getByTestId('usage-gauge-pct-claude')).toHaveTextContent('10%')
    expect(screen.getByTestId('usage-gauge-pct-openai')).toHaveTextContent('85%')
    expect(screen.queryByText('Claude Max')).not.toBeInTheDocument()
    expect(screen.queryByText('OpenAI Max')).not.toBeInTheDocument()
    expect(screen.queryByText('MiniMax Max')).not.toBeInTheDocument()

    // a near-limit provider shows its state, an unconfigured one shows blocked
    expect(screen.getByTestId('provider-state-openai')).toHaveTextContent('near limit')
    expect(screen.getByTestId('provider-state-minimax')).toHaveTextContent('blocked')
  })

  it('unknown usage renders the honest state and NO gauge — never a 0% dial', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payloadWith() })
    render(<ProviderUsageCockpit />)

    // minimax: not configured (usagePct null); openrouter: configured, no telemetry (null)
    expect(await screen.findByTestId('provider-usage-unknown-minimax')).toHaveTextContent('usage unavailable')
    expect(screen.getByTestId('provider-usage-unknown-openrouter')).toHaveTextContent('usage unavailable')
    expect(screen.queryByTestId('usage-gauge-minimax')).not.toBeInTheDocument()
    expect(screen.queryByTestId('usage-gauge-openrouter')).not.toBeInTheDocument()
    expect(screen.queryByRole('meter', { name: /MiniMax/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('meter', { name: /OpenRouter/ })).not.toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    // the provider name still shows, with its state
    expect(screen.getByText('MiniMax API')).toBeInTheDocument()
    expect(screen.getByTestId('provider-state-minimax')).toHaveTextContent('blocked')
  })

  it('gauge tone follows the provider state label, not the rounded percent (UNI-2772 edge)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        payloadWith({
          claude: { configured: true, usagePressure: 0.795 }, // displays 80%, still watching
          openai: { configured: true, usagePressure: 0.8 }, // the near-limit line
        }),
    })
    render(<ProviderUsageCockpit />)

    expect(await screen.findByTestId('usage-gauge-pct-claude')).toHaveTextContent('80%')
    expect(screen.getByTestId('provider-state-claude')).toHaveTextContent('watching')
    expect(screen.getByTestId('usage-gauge-value-claude').getAttribute('stroke')).toContain('--deck-go')

    expect(screen.getByTestId('usage-gauge-pct-openai')).toHaveTextContent('80%')
    expect(screen.getByTestId('provider-state-openai')).toHaveTextContent('near limit')
    expect(screen.getByTestId('usage-gauge-value-openai').getAttribute('stroke')).toContain('--deck-amber')
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
