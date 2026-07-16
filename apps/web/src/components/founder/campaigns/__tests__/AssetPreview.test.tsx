// AssetPreview — approve persists server-side before any state flips (UNI-2395).
// Approve must await POST /api/campaigns/[id]/assets/[assetId]/approve; on
// failure it shows an inline error and does NOT call onApprove.

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetPreview } from '../AssetPreview'
import type { CampaignAsset } from '@/lib/campaigns/types'

const ASSET: CampaignAsset = {
  id: 'asset-1',
  campaignId: 'camp-1',
  founderId: 'founder-1',
  platform: 'linkedin',
  copy: 'Restoration insight for property managers.',
  headline: 'Dry it right the first time',
  cta: 'Book an assessment',
  hashtags: [],
  imageUrl: null,
  imagePrompt: 'prompt',
  width: 1200,
  height: 1200,
  variant: 1,
  socialPostId: null,
  status: 'review',
  visualType: 'photo',
  imageEngine: null,
  qualityScore: null,
  qualityStatus: null,
  createdAt: '2026-07-16T00:00:00Z',
  updatedAt: '2026-07-16T00:00:00Z',
}

describe('AssetPreview approve', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the approve route and only then reports approval to the parent', async () => {
    const onApprove = vi.fn()
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, status: 'ready' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<AssetPreview asset={ASSET} businessKey="dr" onApprove={onApprove} />)

    await userEvent.click(screen.getByRole('button', { name: /approve/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns/camp-1/assets/asset-1/approve',
      { method: 'POST' },
    )
    expect(onApprove).toHaveBeenCalledWith('asset-1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an inline error and does not flip state when the route fails', async () => {
    const onApprove = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to approve asset' }),
    })))

    render(<AssetPreview asset={ASSET} businessKey="dr" onApprove={onApprove} />)

    await userEvent.click(screen.getByRole('button', { name: /approve/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to approve asset')
    expect(onApprove).not.toHaveBeenCalled()
    // The button is back to its idle label — the asset stays in review.
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeEnabled()
  })
})
