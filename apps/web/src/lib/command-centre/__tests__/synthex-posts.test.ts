import { describe, expect, it } from 'vitest'
import { synthexEventSchema } from '@/lib/integrations/synthex-events'
import {
  calendarDay, foldPostEvents, loadSynthexPosts, recordSynthexPostEvent, statusForEvent, toPostEventRow,
  type SynthexPostEventRow, type SynthexPostsClient,
} from '../synthex-posts'

const MISSION = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
const ev = (e: Record<string, unknown>) => synthexEventSchema.parse({ source: 'synthex', timestamp: '2026-10-19T01:00:00.000Z', orgSlug: 'restoreassist', ...e })
const row = (over: Partial<SynthexPostEventRow> & { detail?: Record<string, unknown> }): SynthexPostEventRow => ({
  id: over.id ?? 'r', post_id: 'p1', mission_id: null, event_type: 'content.drafted', status: 'drafted',
  occurred_at: '2026-10-19T01:00:00.000Z', created_at: '2026-10-19T01:00:01.000Z', ...over, detail: over.detail ?? {},
})

function fakeClient(result: { data: unknown; error: { message: string } | null }, insertError: { message: string } | null = null) {
  const calls: unknown[][] = []
  const client: SynthexPostsClient = {
    from(table: string) {
      calls.push(['from', table])
      const chain = {
        insert: (v: unknown) => (calls.push(['insert', v]), Promise.resolve({ error: insertError })),
        select: (c: string) => (calls.push(['select', c]), chain),
        eq: (...a: unknown[]) => (calls.push(['eq', ...a]), chain),
        order: (...a: unknown[]) => (calls.push(['order', ...a]), chain),
        limit: (n: number) => (calls.push(['limit', n]), Promise.resolve(result)),
      }
      return chain as never
    },
  }
  return { client, calls }
}

describe('synthex post events — write side', () => {
  it('derives status from the event type unless the sender set one', () => {
    expect(statusForEvent('content.drafted', null)).toBe('drafted')
    expect(statusForEvent('content.held_for_review', null)).toBe('awaiting_approval')
    expect(statusForEvent('content.approved', null)).toBe('approved')
    expect(statusForEvent('content.published', null)).toBe('published')
    expect(statusForEvent('content.published', 'failed')).toBe('failed')
    expect(statusForEvent('campaign.planned', null)).toBeNull()
  })

  it('builds a row only for events that carry a postId, missionId optional, whitelisted detail only', () => {
    expect(toPostEventRow('f1', ev({ type: 'campaign.planned' }))).toBeNull()
    const r = toPostEventRow('f1', ev({ type: 'content.published', postId: 'p1', platform: 'linkedin', email: 'x@y.z', userId: 'u1' }))!
    expect(r).toMatchObject({ founder_id: 'f1', post_id: 'p1', mission_id: null, event_type: 'content.published', status: 'published', occurred_at: '2026-10-19T01:00:00.000Z' })
    expect(JSON.stringify(r)).not.toContain('x@y.z')
    expect(JSON.stringify(r)).not.toContain('"u1"')
    expect(toPostEventRow('f1', ev({ type: 'content.drafted', postId: 'p1', missionId: MISSION }))!.mission_id).toBe(MISSION)
  })

  it('inserts into cc_synthex_post_events and throws on a failed write', async () => {
    const ok = fakeClient({ data: [], error: null })
    expect(await recordSynthexPostEvent(ok.client, 'f1', ev({ type: 'content.drafted', postId: 'p1' }))).toBe('recorded')
    expect(ok.calls[0]).toEqual(['from', 'cc_synthex_post_events'])
    const none = fakeClient({ data: [], error: null })
    expect(await recordSynthexPostEvent(none.client, 'f1', ev({ type: 'campaign.planned' }))).toBe('skipped')
    expect(none.calls).toEqual([])
    const bad = fakeClient({ data: [], error: null }, { message: 'relation "cc_synthex_post_events" does not exist' })
    await expect(recordSynthexPostEvent(bad.client, 'f1', ev({ type: 'content.drafted', postId: 'p1' }))).rejects.toThrow(/does not exist/)
  })
})

describe('synthex post events — calendar read side', () => {
  it('folds a post’s events into its latest state, keeping earlier non-null fields', () => {
    const posts = foldPostEvents([
      row({ id: 'c', event_type: 'content.published', status: 'published', occurred_at: '2026-10-21T22:00:05.000Z', detail: { postUrl: 'https://www.linkedin.com/feed/update/1', publishedAt: '2026-10-21T22:00:05.000Z', text: null } }),
      row({ id: 'a', event_type: 'content.drafted', status: 'drafted', occurred_at: '2026-10-19T01:00:00.000Z', mission_id: MISSION, detail: { text: 'Hello', platform: 'linkedin', businessSlug: 'restoreassist', thumbnailUrls: ['https://cdn.synthex.social/a.jpg'], approveUrl: 'https://synthex.social/s/p1' } }),
      row({ id: 'b', event_type: 'content.held_for_review', status: 'awaiting_approval', occurred_at: '2026-10-19T01:00:01.000Z', detail: { scheduledAt: '2026-10-21T22:00:00.000Z' } }),
    ])
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      postId: 'p1', status: 'published', text: 'Hello', platform: 'linkedin', businessSlug: 'restoreassist', missionId: MISSION,
      thumbnailUrls: ['https://cdn.synthex.social/a.jpg'], approveUrl: 'https://synthex.social/s/p1', postUrl: 'https://www.linkedin.com/feed/update/1',
      scheduledAt: '2026-10-21T22:00:00.000Z', publishedAt: '2026-10-21T22:00:05.000Z', firstSeenAt: '2026-10-19T01:00:00.000Z', day: '2026-10-22',
    })
  })

  it('places an unscheduled post on its drafted day, in AEST', () => {
    const [p] = foldPostEvents([row({ occurred_at: '2026-10-19T15:30:00.000Z' })])
    expect(p.day).toBe('2026-10-20')
    expect(calendarDay('2026-10-19T13:59:59.000Z')).toBe('2026-10-19')
    expect(calendarDay('2026-10-19T14:00:00.000Z')).toBe('2026-10-20')
  })

  it('ignores wrong-typed stored detail instead of showing it', () => {
    const [p] = foldPostEvents([row({ status: 'live' as never, detail: { text: 42, thumbnailUrls: 'x', approveUrl: 7 } })])
    expect(p).toMatchObject({ status: null, text: null, thumbnailUrls: [], approveUrl: null })
  })

  it('reads only this founder’s rows and reports connected, missing table, and failed reads honestly', async () => {
    const ok = fakeClient({ data: [row({})], error: null })
    const res = await loadSynthexPosts('f1', ok.client)
    expect(res).toMatchObject({ source: 'connected', truncated: false })
    expect(res.posts).toHaveLength(1)
    expect(ok.calls).toContainEqual(['eq', 'founder_id', 'f1'])
    expect(await loadSynthexPosts(null, ok.client)).toMatchObject({ source: 'not_connected', reason: 'no_founder', posts: [] })
    const missing = fakeClient({ data: null, error: { message: 'Could not find the table public.cc_synthex_post_events in the schema cache' } })
    expect(await loadSynthexPosts('f1', missing.client)).toMatchObject({ source: 'not_connected', reason: 'migration_not_applied', posts: [] })
    const failed = fakeClient({ data: null, error: { message: 'timeout' } })
    expect(await loadSynthexPosts('f1', failed.client)).toMatchObject({ source: 'error', error: expect.stringContaining('timeout'), posts: [] })
  })
})
