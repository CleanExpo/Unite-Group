import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import fixture from '@/lib/weekly-tasks/__tests__/margot-first-five.fixture.json'
import { parseMargotWeeklyPacket } from '@/lib/weekly-tasks/margot-packet'
import { MargotWeeklyReview } from '../MargotWeeklyReview'

describe('read-only Margot weekly review', () => {
  it('shows unconfigured source without fake counts, episodes, video or actions', () => {
    const network = vi.fn()
    vi.stubGlobal('fetch', network)
    render(<MargotWeeklyReview review={{ source: 'not_configured' }} />)
    expect(screen.getByText('Weekly packet not connected')).toBeVisible()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve|schedule|publish|generate/i })).not.toBeInTheDocument()
    expect(network).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it('labels a synthetic local packet as a preview, with one reference and four missing videos', () => {
    const parsed = parseMargotWeeklyPacket(fixture)
    if (!parsed.success) throw new Error('Invalid synthetic fixture')
    render(<MargotWeeklyReview review={{ source: 'local_preview', packet: parsed.data }} />)
    expect(screen.getByText('Local editorial preview')).toBeVisible()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getAllByText('Not rendered')).toHaveLength(4)
    const master = screen.getByRole('link', { name: 'Open existing master in HeyGen' })
    expect(master).toHaveAttribute('href', 'https://app.heygen.com/videos/00000000000000000000000000000000')
    expect(screen.getByText(/Publication authority remains pending/)).toBeVisible()
    expect(screen.getByText(/Australia\/Brisbane/)).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/five videos ready/i)).not.toBeInTheDocument()
  })
})
