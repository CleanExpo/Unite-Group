import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CampaignError from '@/app/(founder)/founder/campaigns/error'
import NewCampaignError from '@/app/(founder)/founder/campaigns/new/error'
import CampaignDetailError from '@/app/(founder)/founder/campaigns/[id]/error'
import BookkeeperError from '@/app/(founder)/founder/bookkeeper/error'

vi.mock('@/lib/error-reporting', () => ({ captureClientError: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: () => '/founder/campaigns' }))
afterEach(() => vi.restoreAllMocks())
describe('business route error recovery', () => {
  it.each([CampaignError, NewCampaignError, CampaignDetailError, BookkeeperError])('retains retry for each route boundary', async (Boundary) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reset = vi.fn()
    render(<Boundary error={new Error('Unavailable')} reset={reset} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledOnce()
  })
  it('keeps the existing bookkeeper reconnection destination', () => {
    render(<BookkeeperError error={new Error('Unavailable')} reset={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Reconnect Xero' })).toHaveAttribute('href', '/founder/xero')
  })
})
