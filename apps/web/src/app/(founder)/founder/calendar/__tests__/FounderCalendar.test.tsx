import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { CalendarEvent } from '@/lib/integrations/calendar'
import type { SynthexPost, SynthexPostsResult } from '@/lib/command-centre/synthex-posts'
import { FounderCalendar } from '../FounderCalendar'

const MISSION = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
const post = (postId: string, status: SynthexPost['status'], day: string, over: Partial<SynthexPost> = {}): SynthexPost => ({
  postId, status, day, platform: 'linkedin', businessSlug: 'restoreassist', orgSlug: 'restoreassist', missionId: null,
  text: `Text of ${postId}`, thumbnailUrls: [], approveUrl: null, postUrl: null, scheduledAt: null, publishedAt: null,
  firstSeenAt: `${day}T00:00:00.000Z`, lastEventAt: `${day}T00:00:00.000Z`, ...over,
})
const connected = (posts: SynthexPost[]): SynthexPostsResult => ({ source: 'connected', posts, truncated: false })
const google: CalendarEvent = { id: 'g1', title: 'Board call', start: '2026-10-21T23:00:00.000Z', end: '2026-10-22T00:00:00.000Z', businessKey: 'restore', colour: '#3B82F6', email: 'phill@example.com' }

describe('FounderCalendar', () => {
  it('puts posts and Google events on the same day, coloured by status', () => {
    render(<FounderCalendar events={[google]} posts={connected([
      post('a', 'awaiting_approval', '2026-10-22'), post('b', 'scheduled', '2026-10-22'), post('c', 'approved', '2026-10-23'),
      post('d', 'published', '2026-10-23'), post('e', 'failed', '2026-10-24'),
    ])} />)
    const day = screen.getByRole('region', { name: /22 Oct/ })
    expect(within(day).getByText('Board call')).toBeInTheDocument()
    const colour = (id: string) => screen.getByTestId(`calendar-post-${id}`).style.borderLeftColor
    expect(colour('a')).toBe('rgb(245, 158, 11)')
    expect(colour('b')).toBe('rgb(59, 130, 246)')
    expect(colour('c')).toBe('rgb(59, 130, 246)')
    expect(colour('d')).toBe('rgb(22, 163, 74)')
    expect(colour('e')).toBe('rgb(239, 68, 68)')
    expect(within(day).getAllByRole('button')).toHaveLength(2)
    const days = screen.getAllByRole('region').map(r => r.getAttribute('aria-label'))
    expect(days.findIndex(d => /22 Oct/.test(d!))).toBeLessThan(days.findIndex(d => /24 Oct/.test(d!)))
  })

  it('lists every awaiting_approval post in the strip, whatever its day', () => {
    render(<FounderCalendar events={[]} posts={connected([
      post('a', 'awaiting_approval', '2026-10-22'), post('b', 'published', '2026-10-22'), post('c', 'awaiting_approval', '2027-01-05'),
    ])} />)
    const strip = screen.getByRole('region', { name: 'Awaiting your approval' })
    expect(within(strip).getAllByRole('button').map(b => b.textContent)).toEqual([expect.stringContaining('Text of a'), expect.stringContaining('Text of c')])
  })

  it('shows the full post, media, platform, business, mission and a Synthex approve link on click', () => {
    render(<FounderCalendar events={[]} posts={connected([post('a', 'awaiting_approval', '2026-10-22', {
      text: 'Line one\nLine two', missionId: MISSION, thumbnailUrls: ['https://cdn.synthex.social/a.jpg'],
      approveUrl: 'https://synthex.social/studio/restoreassist/drafts/a',
    })])} />)
    expect(screen.queryByRole('region', { name: 'Post details' })).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('region', { name: /22 Oct/ })).getByRole('button'))
    const detail = screen.getByRole('region', { name: 'Post details' })
    expect(within(detail).getByText(/Line one/).textContent).toBe('Line one\nLine two')
    expect(within(detail).getByRole('img', { name: 'Media thumbnail 1' })).toHaveAttribute('src', 'https://cdn.synthex.social/a.jpg')
    expect(detail).toHaveTextContent('Platform: linkedin')
    expect(detail).toHaveTextContent('Business: restoreassist')
    expect(detail).toHaveTextContent(`Mission id: ${MISSION}`)
    expect(within(detail).getByRole('link', { name: 'Review and approve in Synthex' })).toHaveAttribute('href', 'https://synthex.social/studio/restoreassist/drafts/a')
  })

  it('never links an approve URL off synthex.social, and says when there is no mission id', () => {
    render(<FounderCalendar events={[]} posts={connected([post('a', 'awaiting_approval', '2026-10-22', { approveUrl: 'https://evil.example/synthex.social' })])} />)
    fireEvent.click(within(screen.getByRole('region', { name: /22 Oct/ })).getByRole('button'))
    const detail = screen.getByRole('region', { name: 'Post details' })
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
    expect(detail).toHaveTextContent('Mission id: none sent')
  })

  it('says "No Synthex posts yet" with no data, and never invents posts', () => {
    render(<FounderCalendar events={[]} posts={connected([])} />)
    expect(screen.getByText('No Synthex posts yet')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('separates a missing migration and a failed read from an empty calendar', () => {
    const { unmount } = render(<FounderCalendar events={[]} posts={{ source: 'not_connected', reason: 'migration_not_applied', posts: [], truncated: false }} />)
    expect(screen.getByText(/Synthex posts unavailable — the cc_synthex_post_events migration is not applied/)).toBeInTheDocument()
    expect(screen.queryByText('No Synthex posts yet')).not.toBeInTheDocument()
    unmount()
    render(<FounderCalendar events={[]} posts={{ source: 'error', error: 'timeout', posts: [], truncated: false }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Synthex posts could not be loaded')
    expect(screen.queryByText('No Synthex posts yet')).not.toBeInTheDocument()
  })
})
