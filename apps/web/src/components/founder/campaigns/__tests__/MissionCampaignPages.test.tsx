import { Suspense } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewCampaignPage from '@/app/(founder)/founder/campaigns/new/page'
import CampaignDetailPage from '@/app/(founder)/founder/campaigns/[id]/page'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/founder/campaigns/new' }))
vi.mock('@/components/founder/campaigns/BrandProfileSelector', () => ({
  BrandProfileSelector: ({ onSelect, onScanNew }: { onSelect: (p: object) => void; onScanNew: () => void }) => <>
    <button onClick={() => onSelect({ id: 'brand-real-id', clientName: 'Chosen brand', businessKey: null })}>Choose existing brand</button>
    <button onClick={onScanNew}>Scan new website</button>
  </>,
}))
vi.mock('@/components/founder/campaigns/BrandScanner', () => ({
  BrandScanner: ({ onScanComplete }: { onScanComplete: (id: string, name: string) => void }) =>
    <button onClick={() => onScanComplete('scanned-profile', 'Scanned brand')}>Complete scan</button>,
}))
vi.mock('@/components/founder/campaigns/CampaignGenerator', () => ({
  CampaignGenerator: ({ brandProfileId, brandName, onGenerated, onBack }: { brandProfileId: string; brandName: string; onGenerated: (id: string) => void; onBack: () => void }) => <>
    <p>{brandProfileId} / {brandName}</p>
    <button onClick={() => onGenerated('created-campaign-id')}>Generate campaign</button>
    <button onClick={onBack}>Change brand</button>
  </>,
}))
vi.mock('@/components/founder/campaigns/AssetPreview', () => ({ AssetPreview: () => <p>Existing asset</p> }))

beforeEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

describe('campaign route workflow preservation', () => {
  it('keeps the selected profile ID through generation and navigates to the returned campaign', async () => {
    render(<NewCampaignPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose existing brand' }))
    expect(screen.getByText('brand-real-id / Chosen brand')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Generate campaign' }))
    expect(push).toHaveBeenCalledWith('/founder/campaigns/created-campaign-id')
    expect(screen.getByRole('link', { name: 'Back to campaigns' })).toHaveAttribute('href', '/founder/campaigns')
  })

  it('keeps scan completion and the return to brand selection functional', async () => {
    render(<NewCampaignPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Scan new website' }))
    await userEvent.click(screen.getByRole('button', { name: 'Complete scan' }))
    expect(screen.getByText('scanned-profile / Scanned brand')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change brand' }))
    expect(screen.getByRole('button', { name: 'Choose existing brand' })).toBeInTheDocument()
  })

  it('uses the route ID for loading, exact campaign approval and preparing channel drafts', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () =>
      url.endsWith('/approval') ? { approval: { status: 'approved' } }
        : url.endsWith('/publish') ? { draftsCreated: 1 }
          : { campaign: { theme: 'Real campaign title', status: 'ready', platforms: ['linkedin'] }, assets: [{ id: 'asset-id', status: 'ready' }], approval: { status: 'pending' } },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const params = Promise.resolve({ id: 'route-campaign-id' })
    await act(async () => { render(<Suspense fallback={<p>Loading route</p>}><CampaignDetailPage params={params} /></Suspense>) })
    expect(await screen.findByRole('heading', { name: 'Real campaign title' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prepare channel drafts' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Approve exact campaign' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/route-campaign-id/approval', { method: 'POST' })
    await userEvent.click(screen.getByRole('button', { name: 'Prepare channel drafts' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/route-campaign-id/publish', { method: 'POST' })
    expect(await screen.findByRole('status')).toHaveTextContent('Nothing was published externally.')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/route-campaign-id'))
  })
})
