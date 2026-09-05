import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampaignsView } from '../CampaignsView'
import CampaignsPage from '@/app/(founder)/founder/campaigns/page'

const { getUser, from, select, eq, order, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(),
  redirect: vi.fn(() => { throw new Error('Redirected to login') }),
}))
vi.mock('@/lib/supabase/server', () => ({ getUser }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from }) }))
vi.mock('next/navigation', () => ({ redirect, usePathname: () => '/founder/campaigns' }))
beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ id: 'authenticated-founder' })
  from.mockReturnValue({ select }); select.mockReturnValue({ eq }); eq.mockReturnValue({ order })
  order.mockResolvedValue({ data: [], error: null })
})

describe('campaign source and route boundary', () => {
  it('renders real campaign identifiers returned by the founder-scoped loader', async () => {
    order.mockResolvedValue({ data: [{ id: 'campaign-record', theme: 'Returned campaign', objective: 'awareness', platforms: ['linkedin'], post_count: 2, status: 'draft', created_at: '2026-09-05T00:00:00Z' }], error: null })
    render(await CampaignsPage())
    expect(eq).toHaveBeenCalledWith('founder_id', 'authenticated-founder')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(screen.getByRole('link', { name: /Returned campaign/ })).toHaveAttribute('href', '/founder/campaigns/campaign-record')
    expect(screen.getByRole('link', { name: 'New Campaign' })).toHaveAttribute('href', '/founder/campaigns/new')
  })
  it('keeps successful zero records distinct from unavailable preview data', () => {
    const { rerender } = render(<CampaignsView campaigns={[]} />)
    expect(screen.getByText('No campaigns yet')).toBeInTheDocument()
    rerender(<CampaignsView campaigns={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('Campaign data unavailable')
    expect(screen.queryByText('No campaigns yet')).not.toBeInTheDocument()
  })
  it('fails honestly on a loader error instead of fabricating an empty list', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'Connection unavailable' } })
    await expect(CampaignsPage()).rejects.toThrow('Failed to load campaigns: Connection unavailable')
  })
  it('requires authentication before querying campaigns', async () => {
    getUser.mockResolvedValue(null)
    await expect(CampaignsPage()).rejects.toThrow('Redirected to login')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
    expect(from).not.toHaveBeenCalled()
  })
})
