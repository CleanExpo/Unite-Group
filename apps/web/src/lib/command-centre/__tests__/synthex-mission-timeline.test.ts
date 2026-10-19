import { describe, expect, it } from 'vitest'
import { loadSynthexMissionTimeline, readSynthexTimelineEntry, type SynthexTimelineClient } from '../synthex-mission-timeline'

const TASK = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
const row = (id: string, at: string, payload: Record<string, unknown>) => ({ id, task_id: TASK, type: 'comment', at, payload })
const step = (type: string, occurredAt: string, extra: Record<string, unknown> = {}) => ({
  source: 'synthex', event_type: type, summary: `summary ${type}`, missionId: TASK, eventType: type, occurredAt,
  sentAt: occurredAt, orgSlug: 'restoreassist', platform: null, count: null, window: null, attributionKey: null, url: null, ...extra,
})

/** Records every filter so a test can see the query the reader actually ran. */
function fakeClient(results: Record<string, { data: unknown; error: { message: string } | null }>) {
  const calls: Array<{ table: string; ops: unknown[][] }> = []
  const client: SynthexTimelineClient = {
    from(table: string) {
      const call = { table, ops: [] as unknown[][] }
      calls.push(call)
      const chain = {
        select: (...a: unknown[]) => (call.ops.push(['select', ...a]), chain),
        eq: (...a: unknown[]) => (call.ops.push(['eq', ...a]), chain),
        is: (...a: unknown[]) => (call.ops.push(['is', ...a]), chain),
        order: (...a: unknown[]) => (call.ops.push(['order', ...a]), chain),
        limit: (n: number) => (call.ops.push(['limit', n]), Promise.resolve(results[table])),
      }
      return chain as never
    },
  }
  return { client, calls }
}

describe('synthex mission timeline reader', () => {
  it('reads only this founder’s Synthex comment rows for the mission and orders them by when the step occurred', async () => {
    // Arrival order differs from occurrence order (two concurrent POSTs, K1).
    const { client, calls } = fakeClient({
      cc_task_events: { error: null, data: [
        row('b', '2026-10-19T01:00:02Z', step('content.held_for_review', '2026-10-19T01:00:00.500Z')),
        row('a', '2026-10-19T01:00:03Z', step('content.drafted', '2026-10-19T01:00:00.100Z')),
        row('c', '2026-10-19T03:00:00Z', step('outcome.trials', '2026-10-19T02:59:00.000Z', { count: 0, window: '2026-W42', attributionKey: 'utm_source=synthex' })),
      ] },
      cc_agent_events: { error: null, data: [{ id: 'w1', tool_name: 'content.published', target: 'Synthex published … · no mission id', created_at: '2026-10-19T02:00:00Z' }] },
    })
    const result = await loadSynthexMissionTimeline('founder-1', TASK, client)
    expect(result.entries.map(e => e.eventType)).toEqual(['content.drafted', 'content.held_for_review', 'outcome.trials'])
    expect(result.entries[2]).toMatchObject({ count: 0, window: '2026-W42', attributionKey: 'utm_source=synthex', missionId: TASK })
    expect(result.unlinked).toEqual([{ id: 'w1', eventType: 'content.published', target: 'Synthex published … · no mission id', receivedAt: '2026-10-19T02:00:00Z' }])
    expect(result.truncated).toBe(false)
    const [events, wall] = calls
    expect(events.table).toBe('cc_task_events')
    expect(events.ops).toEqual(expect.arrayContaining([
      ['eq', 'founder_id', 'founder-1'], ['eq', 'task_id', TASK], ['eq', 'type', 'comment'], ['eq', 'payload->>source', 'synthex'],
    ]))
    expect(wall.table).toBe('cc_agent_events')
    expect(wall.ops).toEqual(expect.arrayContaining([
      ['eq', 'founder_id', 'founder-1'], ['eq', 'agent_name', 'synthex'], ['is', 'plan_key', null],
    ]))
  })

  it('throws on a failed read instead of returning an empty timeline', async () => {
    const failed = fakeClient({ cc_task_events: { data: null, error: { message: 'boom' } }, cc_agent_events: { data: [], error: null } })
    await expect(loadSynthexMissionTimeline('founder-1', TASK, failed.client)).rejects.toThrow(/boom/)
    const wallFailed = fakeClient({ cc_task_events: { data: [], error: null }, cc_agent_events: { data: null, error: { message: 'wall down' } } })
    await expect(loadSynthexMissionTimeline('founder-1', TASK, wallFailed.client)).rejects.toThrow(/wall down/)
  })

  it('reads rows written before structured detail existed as summary-only, with no invented values', () => {
    const entry = readSynthexTimelineEntry(row('old', '2026-10-19T01:00:00Z', { source: 'synthex', event_type: 'content.published', summary: 'Synthex published a linkedin post' }))
    expect(entry).toEqual({
      id: 'old', receivedAt: '2026-10-19T01:00:00Z', occurredAt: null, eventType: 'content.published', summary: 'Synthex published a linkedin post',
      missionId: TASK, count: null, window: null, attributionKey: null, url: null,
    })
    // A wrong-typed count is not a number we can show.
    expect(readSynthexTimelineEntry(row('x', '2026-10-19T01:00:00Z', step('outcome.trials', '2026-10-19T01:00:00Z', { count: '3' })))?.count).toBeNull()
  })
})
