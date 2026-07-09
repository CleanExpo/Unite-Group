// src/lib/command-centre/__tests__/founder-workboard.test.ts
//
// UNI-2340 slices 4+5 — fetchActionQueue / fetchBlockedLanes.

import { describe, expect, it, vi } from 'vitest'
import {
  fetchActionQueue,
  fetchBlockedLanes,
  mapActionQueueToRows,
  mapBlockedIssuesToRows,
  sortActionQueueIssues,
  type MinimalFetch,
} from '@/lib/command-centre/founder-workboard'

function jsonFetch(status: number, body: unknown): MinimalFetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }))
}

function issueNode(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'id-1',
    identifier: 'UNI-1',
    title: 'Some issue',
    priority: 3,
    url: 'https://linear.app/x/issue/UNI-1',
    updatedAt: '2026-07-01T00:00:00.000Z',
    state: { id: 's1', name: 'Todo', type: 'unstarted' },
    ...over,
  }
}

describe('fetchActionQueue', () => {
  it('returns not_configured when no API key is present', async () => {
    const fetchImpl = vi.fn()
    const result = await fetchActionQueue({ apiKey: undefined, fetchImpl: fetchImpl as unknown as MinimalFetch })
    expect(result).toEqual({ ok: 'not_configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('maps and orders the happy path: Urgent, then High, then updatedAt desc', async () => {
    const fetchImpl = jsonFetch(200, {
      data: {
        viewer: {
          assignedIssues: {
            nodes: [
              issueNode({ id: 'a', identifier: 'UNI-1', priority: 3, updatedAt: '2026-07-01T00:00:00.000Z' }),
              issueNode({ id: 'b', identifier: 'UNI-2', priority: 1, updatedAt: '2026-07-02T00:00:00.000Z' }),
              issueNode({ id: 'c', identifier: 'UNI-3', priority: 1, updatedAt: '2026-07-03T00:00:00.000Z' }),
              issueNode({ id: 'd', identifier: 'UNI-4', priority: 2, updatedAt: '2026-07-01T00:00:00.000Z' }),
              issueNode({ id: 'e', identifier: 'UNI-5', priority: 0, updatedAt: '2026-07-05T00:00:00.000Z' }),
            ],
          },
        },
      },
    })
    const result = await fetchActionQueue({ apiKey: 'key-1', fetchImpl })
    expect(result.ok).toBe(true)
    if (!result.ok || result.ok !== true) throw new Error('expected ok:true')
    // Urgent (c newer than b) > High (d) > Normal (a) > None (e) last
    expect(result.issues.map((i) => i.identifier)).toEqual(['UNI-3', 'UNI-2', 'UNI-4', 'UNI-1', 'UNI-5'])

    const [call] = fetchImpl.mock.calls
    expect(call[0]).toBe('https://api.linear.app/graphql')
    expect((call[1].headers as Record<string, string>).authorization).toBe('key-1')
    expect((call[1].headers as Record<string, string>).authorization).not.toMatch(/^Bearer/)
  })

  it('caps the mapped queue at 5 issues', async () => {
    const nodes = Array.from({ length: 8 }, (_, i) =>
      issueNode({ id: `id-${i}`, identifier: `UNI-${i}`, priority: 1, updatedAt: `2026-07-0${(i % 9) + 1}T00:00:00.000Z` }),
    )
    const fetchImpl = jsonFetch(200, { data: { viewer: { assignedIssues: { nodes } } } })
    const result = await fetchActionQueue({ apiKey: 'key-1', fetchImpl })
    if (!result.ok) throw new Error('expected ok')
    expect(result.issues).toHaveLength(5)
  })

  it('drops malformed nodes (missing required fields)', async () => {
    const fetchImpl = jsonFetch(200, {
      data: {
        viewer: {
          assignedIssues: {
            nodes: [
              issueNode({ id: 'ok-1' }),
              { id: 'bad-1' }, // missing identifier/title/priority/updatedAt
              { identifier: 'UNI-9', title: 'no id', priority: 1, updatedAt: '2026-07-01T00:00:00.000Z' }, // missing id
              null,
            ],
          },
        },
      },
    })
    const result = await fetchActionQueue({ apiKey: 'key-1', fetchImpl })
    if (!result.ok) throw new Error('expected ok')
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].id).toBe('ok-1')
  })

  it('returns an honest error on a GraphQL errors payload', async () => {
    const fetchImpl = jsonFetch(200, { errors: [{ message: 'boom' }] })
    const result = await fetchActionQueue({ apiKey: 'key-1', fetchImpl })
    expect(result).toEqual({ ok: false, error: 'graphql error' })
  })

  it('returns an honest error on a non-2xx HTTP status', async () => {
    const fetchImpl = jsonFetch(500, {})
    const result = await fetchActionQueue({ apiKey: 'key-1', fetchImpl })
    expect(result).toEqual({ ok: false, error: 'HTTP 500' })
  })

  it('returns an honest error when fetch itself throws', async () => {
    const fetchImpl: MinimalFetch = vi.fn(async () => {
      throw new Error('network down')
    })
    const result = await fetchActionQueue({ apiKey: 'key-1', fetchImpl })
    expect(result).toEqual({ ok: false, error: 'network down' })
  })

  it('sortActionQueueIssues: None(0) sorts after Low(4)', () => {
    const issues = [
      { id: '1', identifier: 'A', title: 't', priority: 4, url: '', updatedAt: '2026-01-01T00:00:00.000Z', stateName: '' },
      { id: '2', identifier: 'B', title: 't', priority: 0, url: '', updatedAt: '2026-01-02T00:00:00.000Z', stateName: '' },
    ]
    expect(sortActionQueueIssues(issues).map((i) => i.identifier)).toEqual(['A', 'B'])
  })
})

describe('fetchBlockedLanes', () => {
  it('returns not_configured when no API key is present', async () => {
    const fetchImpl = vi.fn()
    const result = await fetchBlockedLanes({ apiKey: undefined, fetchImpl: fetchImpl as unknown as MinimalFetch })
    expect(result).toEqual({ ok: 'not_configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('dedups an issue matching both the blocked-state and blocked-label arms', async () => {
    const fetchImpl = jsonFetch(200, {
      data: {
        issues: {
          nodes: [
            issueNode({
              id: 'dup-1',
              identifier: 'UNI-10',
              state: { id: 's', name: 'Blocked', type: 'started' },
              labels: { nodes: [{ name: 'blocked' }] },
            }),
            // Same issue returned again (defensive dedup — Linear itself
            // shouldn't duplicate a node, but we never trust that blindly).
            issueNode({
              id: 'dup-1',
              identifier: 'UNI-10',
              state: { id: 's', name: 'Blocked', type: 'started' },
              labels: { nodes: [{ name: 'blocked' }] },
            }),
            issueNode({
              id: 'label-only',
              identifier: 'UNI-11',
              state: { id: 's2', name: 'In Progress', type: 'started' },
              labels: { nodes: [{ name: 'Blocked' }] },
            }),
          ],
        },
      },
    })
    const result = await fetchBlockedLanes({ apiKey: 'key-1', fetchImpl })
    if (!result.ok) throw new Error('expected ok')
    expect(result.issues).toHaveLength(2)
    expect(result.issues.map((i) => i.id)).toEqual(['dup-1', 'label-only'])
  })

  it('drops malformed nodes', async () => {
    const fetchImpl = jsonFetch(200, {
      data: { issues: { nodes: [issueNode({ id: 'ok-1' }), { id: 'bad' }] } },
    })
    const result = await fetchBlockedLanes({ apiKey: 'key-1', fetchImpl })
    if (!result.ok) throw new Error('expected ok')
    expect(result.issues).toHaveLength(1)
  })

  it('returns an honest error on a GraphQL errors payload', async () => {
    const fetchImpl = jsonFetch(200, { errors: [{ message: 'boom' }] })
    const result = await fetchBlockedLanes({ apiKey: 'key-1', fetchImpl })
    expect(result).toEqual({ ok: false, error: 'graphql error' })
  })
})

describe('mapActionQueueToRows', () => {
  it('keeps # and Action header substrings the tile column-picker matches', () => {
    const { headers, rows } = mapActionQueueToRows([
      { id: '1', identifier: 'UNI-1', title: 'Fix thing', priority: 1, url: '', updatedAt: '2026-07-01T00:00:00.000Z', stateName: 'Todo' },
    ])
    expect(headers.some((h) => h.toLowerCase().includes('#'))).toBe(true)
    expect(headers.some((h) => h.toLowerCase().includes('action'))).toBe(true)
    expect(rows[0]).toEqual(['UNI-1', 'Fix thing', 'Urgent', '2026-07-01T00:00:00.000Z'])
  })
})

describe('mapBlockedIssuesToRows', () => {
  it('maps identifier suffix to number, and names the blocking reason', () => {
    const rows = mapBlockedIssuesToRows([
      { id: '1', identifier: 'UNI-2340', title: 'Blocked thing', priority: 2, url: '', updatedAt: '', stateName: 'Blocked', labelNames: [] },
      { id: '2', identifier: 'UNI-9', title: 'Labelled', priority: 3, url: '', updatedAt: '', stateName: 'In Progress', labelNames: ['blocked'] },
    ])
    expect(rows[0]).toMatchObject({ number: 2340, name: 'Blocked thing', status: 'Blocked', autonomous: 'blocked' })
    expect(rows[0].required_authority).toBe('state: Blocked')
    expect(rows[1].required_authority).toBe('label: blocked')
  })
})
