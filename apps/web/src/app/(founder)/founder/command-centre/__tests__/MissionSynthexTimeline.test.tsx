import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { SynthexMissionTimeline, SynthexTimelineEntry } from '@/lib/command-centre/synthex-mission-timeline'
import { MissionSynthexTimelineView } from '../MissionSynthexTimeline'

const TASK = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
const entry = (id: string, eventType: string, occurredAt: string | null, extra: Partial<SynthexTimelineEntry> = {}): SynthexTimelineEntry => ({
  id, receivedAt: '2026-10-19T01:00:05.000Z', occurredAt, eventType, summary: `summary of ${eventType}`, missionId: TASK,
  count: null, window: null, attributionKey: null, postUrl: null,
  businessSlug: 'restoreassist', platform: null, postId: null, status: null, scheduledAt: null, publishedAt: null, text: null, thumbnailUrls: [], approveUrl: null, ...extra,
})
const timeline = (entries: SynthexTimelineEntry[], unlinked: SynthexMissionTimeline['unlinked'] = []): SynthexMissionTimeline =>
  ({ taskId: TASK, entries, unlinked, truncated: false })

describe('MissionSynthexTimelineView', () => {
  it('lists the six mission steps in the given order with their structured fields', () => {
    render(<MissionSynthexTimelineView data={timeline([
      entry('1', 'campaign.planned', '2026-10-19T00:00:00.000Z'),
      entry('2', 'content.drafted', '2026-10-19T00:10:00.000Z'),
      entry('3', 'content.held_for_review', '2026-10-19T00:10:01.000Z'),
      entry('4', 'content.approved', '2026-10-19T02:00:00.000Z'),
      entry('5', 'content.published', '2026-10-19T03:00:00.000Z', { postUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1/' }),
      entry('6', 'outcome.trials', '2026-10-20T00:00:00.000Z', { count: 0, window: '2026-10-12/2026-10-18', attributionKey: 'utm_source=synthex' }),
    ])} />)
    const items = within(screen.getByRole('list', { name: 'Synthex events for this mission' })).getAllByRole('listitem')
    expect(items.map(li => li.getAttribute('data-event'))).toEqual(['campaign.planned', 'content.drafted', 'content.held_for_review', 'content.approved', 'content.published', 'outcome.trials'])
    expect(items[0]).toHaveTextContent('19 Oct, 10:00 am AEST')
    expect(items[5]).toHaveTextContent('Trials: 0')
    expect(items[5]).toHaveTextContent('Window: 2026-10-12/2026-10-18')
    expect(items[5]).toHaveTextContent('Attribution: utm_source=synthex')
    expect(within(items[4]).getByRole('link', { name: 'Open LinkedIn post' })).toHaveAttribute('href', 'https://www.linkedin.com/feed/update/urn:li:activity:1/')
    expect(items[0]).toHaveTextContent(`Mission id: ${TASK}`)
  })

  it('shows a failed RA read as unknown, never as zero', () => {
    render(<MissionSynthexTimelineView data={timeline([entry('1', 'outcome.read_failed', '2026-10-20T00:00:00.000Z', { window: '2026-W42' })])} />)
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Trials: unknown — RA read failed')
    expect(item).not.toHaveTextContent('Trials: 0')
  })

  it('links only https LinkedIn posts; other URLs stay as text', () => {
    render(<MissionSynthexTimelineView data={timeline([entry('1', 'content.published', null, { postUrl: 'https://evil.example/linkedin.com/x' })])} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('Post: https://evil.example/linkedin.com/x')
    expect(screen.getByRole('listitem')).toHaveTextContent('Occurred time not recorded')
  })

  it('states an empty timeline plainly and shows events that arrived without a mission id', () => {
    render(<MissionSynthexTimelineView data={timeline([], [{ id: 'w1', eventType: 'outcome.trials', target: 'Synthex outcome: 3 trials … · no mission id', receivedAt: '2026-10-19T02:00:00.000Z' }])} />)
    expect(screen.getByText('No Synthex events are recorded for this mission yet.')).toBeInTheDocument()
    const unlinked = screen.getByRole('list', { name: 'Synthex events with no mission id' })
    expect(unlinked).toHaveTextContent('outcome.trials')
    expect(unlinked).toHaveTextContent('Synthex outcome: 3 trials … · no mission id')
  })
})

describe('MissionSynthexTimelineView — reading and approving a post', () => {
  it('shows status, schedule, the full post text and a Synthex approve link', () => {
    render(<MissionSynthexTimelineView data={timeline([entry('1', 'content.held_for_review', '2026-10-19T00:10:01.000Z', {
      postId: 'cm9', platform: 'linkedin', status: 'awaiting_approval', scheduledAt: '2026-10-21T22:00:00.000Z',
      text: 'First line\nSecond line', thumbnailUrls: ['https://cdn.synthex.social/a.jpg'], approveUrl: 'https://synthex.social/studio/ccw/drafts/cm9',
    })])} />)
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Status: awaiting approval')
    expect(item).toHaveTextContent('Scheduled: 22 Oct, 08:00 am AEST')
    expect(item).toHaveTextContent('Post cm9 · linkedin')
    expect(within(item).getByText(/First line/).textContent).toBe('First line\nSecond line')
    expect(item).toHaveTextContent('Media: https://cdn.synthex.social/a.jpg')
    expect(within(item).getByRole('link', { name: 'Review and approve in Synthex' })).toHaveAttribute('href', 'https://synthex.social/studio/ccw/drafts/cm9')
  })

  it('does not link an approve URL outside synthex.social', () => {
    render(<MissionSynthexTimelineView data={timeline([entry('1', 'content.drafted', null, { approveUrl: 'https://synthex.social.evil.example/x' })])} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('Approve link (not Synthex, not linked): https://synthex.social.evil.example/x')
  })
})
