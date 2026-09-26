import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PortfolioHealthTile } from './PortfolioHealthTile'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('PortfolioHealthTile', () => {
  it('renders per-repo red/yellow/green badges, the overall dot and the P0/P1 count', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        source: 'github_live',
        overall: 'red',
        openP0P1: 2,
        linearSource: 'linear_live',
        timestamp: '2026-07-05T02:00:00Z',
        repos: [
          { repo: 'RestoreAssist', fullName: 'CleanExpo/RestoreAssist', latestConclusion: 'success', failCountLast10: 0, latestRunAt: '2026-07-05T02:00:00Z', latestRunUrl: null, color: 'green' },
          { repo: 'Synthex', fullName: 'CleanExpo/Synthex', latestConclusion: 'failure', failCountLast10: 3, latestRunAt: '2026-07-05T02:00:00Z', latestRunUrl: null, color: 'red' },
          { repo: 'Nexus', fullName: 'CleanExpo/Unite-Group', latestConclusion: 'success', failCountLast10: 1, latestRunAt: '2026-07-05T02:00:00Z', latestRunUrl: null, color: 'yellow' },
        ],
      }),
    } as unknown as Response)

    render(<PortfolioHealthTile />)

    await waitFor(() => expect(screen.getByTestId('portfolio-repo-Synthex')).toBeInTheDocument())
    expect(screen.getByTestId('portfolio-badge-RestoreAssist')).toHaveAttribute('data-color', 'green')
    expect(screen.getByTestId('portfolio-badge-Synthex')).toHaveAttribute('data-color', 'red')
    expect(screen.getByTestId('portfolio-badge-Nexus')).toHaveAttribute('data-color', 'yellow')
    expect(screen.getByTestId('portfolio-overall-dot')).toBeInTheDocument()
    expect(screen.getByText(/2 P0\/P1 open/)).toBeInTheDocument()
  })

  it('renders a not-configured state when GITHUB_TOKEN is absent', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false, source: 'not_configured', repos: [], overall: 'grey', openP0P1: null, linearSource: 'not_configured', timestamp: '2026-07-05T02:00:00Z' }),
    } as unknown as Response)

    render(<PortfolioHealthTile />)

    await waitFor(() => expect(screen.getByText(/not configured/i)).toBeInTheDocument())
    expect(screen.queryByTestId('portfolio-repo-Synthex')).not.toBeInTheDocument()
  })

  it('shows the P0/P1 as n/a when Linear is not configured', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true, source: 'github_live', overall: 'green', openP0P1: null, linearSource: 'not_configured', timestamp: '2026-07-05T02:00:00Z',
        repos: [{ repo: 'Nexus', fullName: 'CleanExpo/Unite-Group', latestConclusion: 'success', failCountLast10: 0, latestRunAt: null, latestRunUrl: null, color: 'green' }],
      }),
    } as unknown as Response)

    render(<PortfolioHealthTile />)

    await waitFor(() => expect(screen.getByTestId('portfolio-repo-Nexus')).toBeInTheDocument())
    expect(screen.getByText(/P0\/P1 n\/a/)).toBeInTheDocument()
  })

  it('draws a stacked bar only for repos whose run counts were actually read', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true, source: 'partial', overall: 'red', openP0P1: null, linearSource: 'not_configured', timestamp: '2026-07-05T02:00:00Z',
        repos: [
          { repo: 'Synthex', fullName: 'CleanExpo/Synthex', latestConclusion: 'failure', failCountLast10: 3, latestRunAt: '2026-07-05T02:00:00Z', latestRunUrl: null, color: 'red' },
          { repo: 'RestoreAssist', fullName: 'CleanExpo/RestoreAssist', latestConclusion: 'unknown', failCountLast10: 0, latestRunAt: null, latestRunUrl: null, color: 'grey', error: 'github_http_500' },
          { repo: 'Nexus', fullName: 'CleanExpo/Unite-Group', latestConclusion: 'unknown', failCountLast10: 0, latestRunAt: null, latestRunUrl: null, color: 'yellow' },
        ],
      }),
    } as unknown as Response)

    render(<PortfolioHealthTile />)

    await waitFor(() => expect(screen.getByTestId('portfolio-bar-Synthex')).toBeInTheDocument())
    expect(screen.getByTestId('portfolio-bar-Synthex-failed').style.width).toBe('30%')
    expect(screen.queryByTestId('portfolio-bar-RestoreAssist')).not.toBeInTheDocument()
    expect(screen.queryByTestId('portfolio-bar-Nexus')).not.toBeInTheDocument()
    expect(screen.getByTestId('portfolio-repo-RestoreAssist')).toHaveTextContent('unreadable')
    expect(screen.getByTestId('portfolio-repo-Nexus')).toHaveTextContent('no runs')
    expect(screen.getByTestId('portfolio-bar-legend')).toHaveTextContent(/Failed.*Not failed.*last 10 runs/)
  })

  it('shows no legend when no repo has a bar', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true, source: 'error', overall: 'grey', openP0P1: null, linearSource: 'not_configured', timestamp: '2026-07-05T02:00:00Z',
        repos: [{ repo: 'Nexus', fullName: 'CleanExpo/Unite-Group', latestConclusion: 'unknown', failCountLast10: 0, latestRunAt: null, latestRunUrl: null, color: 'grey', error: 'boom' }],
      }),
    } as unknown as Response)

    render(<PortfolioHealthTile />)

    await waitFor(() => expect(screen.getByTestId('portfolio-repo-Nexus')).toBeInTheDocument())
    expect(screen.queryByTestId('portfolio-bar-Nexus')).not.toBeInTheDocument()
    expect(screen.queryByTestId('portfolio-bar-legend')).not.toBeInTheDocument()
  })

  it('surfaces a degraded banner when the fetch itself fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as unknown as Response)

    render(<PortfolioHealthTile />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/Portfolio Health/)
  })

  it('a failed refresh after a good read hides the bars and legend but keeps the roster', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const data = {
        configured: true,
        source: 'github_live',
        overall: 'green',
        openP0P1: 0,
        linearSource: 'linear_live',
        timestamp: '2026-09-25T01:00:00Z',
        repos: [
          {
            repo: 'Review',
            fullName: 'CleanExpo/Review',
            latestConclusion: 'success',
            latestRunUrl: null,
            latestRunAt: '2026-09-25T01:00:00Z',
            failCountLast10: 0,
            color: 'green',
          },
        ],
      }
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: true, json: async () => data } as Response)
        .mockResolvedValue({ ok: false, status: 500 } as Response)
      render(<PortfolioHealthTile />)
      await waitFor(() => expect(screen.getByTestId('portfolio-bar-Review')).toBeInTheDocument())
      expect(screen.getByTestId('portfolio-bar-legend')).toBeInTheDocument()
      await vi.advanceTimersByTimeAsync(60_000)
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('portfolio_health_http_500'))
      expect(screen.queryByTestId('portfolio-bar-Review')).not.toBeInTheDocument()
      expect(screen.queryByTestId('portfolio-bar-legend')).not.toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
