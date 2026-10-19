import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { SynthexMissionTimeline, SynthexTimelineEntry } from '@/lib/command-centre/synthex-mission-timeline'
import { MissionSynthexTimelineView } from '../MissionSynthexTimeline'

const TASK = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
const entry = (id: string, eventType: string, occurredAt: string | null, extra: Partial<SynthexTimelineEntry> = {}): SynthexTimelineEntry => ({
  id, receivedAt: '2026-10-19T01:00:05.000Z', occurredAt, eventType, summary: `summary of ${eventType}`, missionId: TASK,
  count: null, window: null, attributionKey: null, url: null, ...extra,
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
      entry('5', 'content.published', '2026-10-19T03:00:00.000Z', { url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/' }),
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
    render(<MissionSynthexTimelineView data={timeline([entry('1', 'content.published', null, { url: 'https://evil.example/linkedin.com/x' })])} />)
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
