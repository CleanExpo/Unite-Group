import { describe, it, expect } from 'vitest'
import { buildActivityFeed } from '@/lib/command-centre/activity-feed'
import type { CommandCentreTask, TaskStatus } from '@/lib/command-centre/tasks'

const NOW = new Date('2026-06-16T03:00:00.000Z')

function makeTask(overrides: Partial<CommandCentreTask> = {}): CommandCentreTask {
  return {
    id: 'task-1',
    founder_id: 'user-123',
    external_ref: null,
    queue_id: null,
    project_id: null,
    project_key: 'unite-group',
    title: 'Build the activity feed',
    objective: 'Build the activity feed',
    priority: 'P2',
    status: 'running',
    agent_owner: 'Hermes',
    risk_level: 'low',
    execution_mode: 'advisory',
    origin: 'idea',
    dependencies: [],
    human_approval_required: false,
    evidence_path: null,
    validation_required: [],
    linear_id: null,
    preview_url: null,
    metadata: {},
    created_at: '2026-06-16T01:00:00.000Z',
    updated_at: '2026-06-16T02:00:00.000Z',
    ...overrides,
  }
}

describe('buildActivityFeed', () => {
  it('returns no events and a null sourceLiveAt for an empty task list (honest seed)', () => {
    const feed = buildActivityFeed([], { now: NOW })
    expect(feed.source).toBe('cc:activity')
    expect(feed.generatedAt).toBe(NOW.toISOString())
    expect(feed.events).toHaveLength(0)
    expect(feed.sourceLiveAt).toBeNull()
  })

  it('sets sourceLiveAt to generatedAt once at least one real event exists', () => {
    const feed = buildActivityFeed([makeTask()], { now: NOW })
    expect(feed.events).toHaveLength(1)
    expect(feed.sourceLiveAt).toBe(NOW.toISOString())
  })

  it('falls back to Pi-CEO when a task has no agent_owner', () => {
    const feed = buildActivityFeed([makeTask({ agent_owner: null })], { now: NOW })
    expect(feed.events[0].agent).toBe('Pi-CEO')
  })

  it('maps each status to the expected verb and severity', () => {
    const cases: Array<{ status: TaskStatus; verb: string; severity: string }> = [
      { status: 'proposed', verb: 'proposed', severity: 'hush' },
      { status: 'queued', verb: 'queued', severity: 'hush' },
      { status: 'running', verb: 'working on', severity: 'running' },
      { status: 'blocked', verb: 'blocked on', severity: 'signal' },
      { status: 'awaiting_approval', verb: 'awaiting approval', severity: 'signal' },
      { status: 'done', verb: 'shipped', severity: 'signal' },
      { status: 'failed', verb: 'failed', severity: 'signal' },
    ]
    for (const { status, verb, severity } of cases) {
      const feed = buildActivityFeed([makeTask({ id: `t-${status}`, status })], { now: NOW })
      expect(feed.events[0].verb).toBe(verb)
      expect(feed.events[0].severity).toBe(severity)
    }
  })

  it('derives a linear origin + Linear url from a linear_id', () => {
    const feed = buildActivityFeed([makeTask({ linear_id: 'UNI-2137' })], { now: NOW })
    expect(feed.events[0].origin).toBe('linear')
    expect(feed.events[0].url).toBe('https://linear.app/unite-group/issue/UNI-2137')
  })

  it('derives a linear origin from a packet linearIssueId in metadata', () => {
    const feed = buildActivityFeed(
      [makeTask({ metadata: { packet: { linearIssueId: 'SYN-99' } } })],
      { now: NOW },
    )
    expect(feed.events[0].origin).toBe('linear')
    expect(feed.events[0].url).toBe('https://linear.app/unite-group/issue/SYN-99')
  })

  it('derives a github origin + url from a github preview_url', () => {
    const feed = buildActivityFeed(
      [makeTask({ preview_url: 'https://github.com/CleanExpo/Unite-Hub/pull/42' })],
      { now: NOW },
    )
    expect(feed.events[0].origin).toBe('github')
    expect(feed.events[0].url).toBe('https://github.com/CleanExpo/Unite-Hub/pull/42')
  })

  it('derives a provider origin + url from a non-github preview_url', () => {
    const feed = buildActivityFeed(
      [makeTask({ preview_url: 'https://unite-hub-sandbox.vercel.app' })],
      { now: NOW },
    )
    expect(feed.events[0].origin).toBe('provider')
    expect(feed.events[0].url).toBe('https://unite-hub-sandbox.vercel.app')
  })

  it('derives an evidence origin (no url) from an evidence_path', () => {
    const feed = buildActivityFeed(
      [makeTask({ evidence_path: 'docs/brain/evidence/uni-2137.md' })],
      { now: NOW },
    )
    expect(feed.events[0].origin).toBe('evidence')
    expect(feed.events[0].url).toBeUndefined()
  })

  it('derives a provider origin from a foreign project_key with no link', () => {
    const feed = buildActivityFeed([makeTask({ project_key: 'synthex' })], { now: NOW })
    expect(feed.events[0].origin).toBe('provider')
    expect(feed.events[0].url).toBeUndefined()
  })

  it('defaults to a cc origin for an internal task with no external source', () => {
    const feed = buildActivityFeed([makeTask()], { now: NOW })
    expect(feed.events[0].origin).toBe('cc')
    expect(feed.events[0].url).toBeUndefined()
  })

  it('orders events newest-first by timestamp', () => {
    const older = makeTask({ id: 'older', title: 'Older', updated_at: '2026-06-16T00:30:00.000Z' })
    const newer = makeTask({ id: 'newer', title: 'Newer', updated_at: '2026-06-16T02:45:00.000Z' })
    const feed = buildActivityFeed([older, newer], { now: NOW })
    expect(feed.events.map((e) => e.id)).toEqual(['newer', 'older'])
  })

  it('falls back to created_at when updated_at is absent', () => {
    const task = makeTask({ updated_at: undefined as unknown as string, created_at: '2026-06-16T01:15:00.000Z' })
    const feed = buildActivityFeed([task], { now: NOW })
    expect(feed.events[0].ts).toBe('2026-06-16T01:15:00.000Z')
  })

  it('caps the feed at the requested limit', () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: `t-${i}`, updated_at: `2026-06-16T0${i}:00:00.000Z` }),
    )
    const feed = buildActivityFeed(tasks, { now: NOW, limit: 2 })
    expect(feed.events).toHaveLength(2)
  })
})
