// UNI-2384 — Matrix wall Wave B2 read path tests. The honest-state contract:
// missing table ⇒ dark (not_connected), zero rows ⇒ honest empty, rows ⇒
// passed through untouched. Never fabricates, never crashes the deck.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import {
  loadAgentEventsWall,
  isMissingTableError,
  eventVerb,
  relativeAge,
} from '@/lib/command-centre/agent-events-wall'

// Fake founder client matching listAgentEvents' chain:
// from(...).select(...).eq(...).order(...).limit(n) → {data,error}
function fakeDb(opts: { data?: unknown[]; error?: string } = {}) {
  const builder = {
    eq() {
      return this
    },
    order() {
      return this
    },
    async limit() {
      return { data: opts.error ? null : opts.data ?? [], error: opts.error ? { message: opts.error } : null }
    },
  }
  return { from: () => ({ select: () => builder }) }
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    founder_id: 'founder_1',
    session_id: 'sess_1',
    agent_name: 'nexus-runner',
    surface: 'claude-code',
    machine: null,
    repo: null,
    project_key: null,
    plan_key: 'UNI-2384',
    event_type: 'status',
    tool_name: 'claimed',
    target: 'UNI-2384',
    created_at: '2026-07-16T00:00:00.000Z',
    ...overrides,
  }
}

describe('loadAgentEventsWall — honest states', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns not_connected without a founder (no query, no fabricated rows)', async () => {
    const res = await loadAgentEventsWall(null)
    expect(res).toEqual({ events: [], source: 'not_connected', reason: 'no_founder' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('maps a missing cc_agent_events table to the dark state, never a crash', async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeDb({ error: "Could not find the table 'public.cc_agent_events' in the schema cache" }) as never,
    )
    const res = await loadAgentEventsWall('founder_1')
    expect(res.source).toBe('not_connected')
    expect(res.reason).toBe('migration_not_applied')
    expect(res.events).toEqual([])
  })

  it('maps a Postgres 42P01 relation-missing failure to the dark state too', async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeDb({ error: 'relation "public.cc_agent_events" does not exist' }) as never,
    )
    const res = await loadAgentEventsWall('founder_1')
    expect(res.source).toBe('not_connected')
    expect(res.reason).toBe('migration_not_applied')
  })

  it('returns error honestly on any other query failure (never fabricates)', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeDb({ error: 'rls denied' }) as never)
    const res = await loadAgentEventsWall('founder_1')
    expect(res.source).toBe('error')
    expect(res.events).toEqual([])
    expect(res.error).toContain('rls denied')
  })

  it('returns connected with zero rows when the table is empty (no fake activity)', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeDb({ data: [] }) as never)
    const res = await loadAgentEventsWall('founder_1')
    expect(res).toEqual({ events: [], source: 'connected' })
  })

  it('returns connected rows untouched (accessor already orders newest-first)', async () => {
    const rows = [row({ id: 'evt_2', tool_name: 'draft_pr_opened' }), row({ id: 'evt_1' })]
    vi.mocked(createClient).mockResolvedValue(fakeDb({ data: rows }) as never)
    const res = await loadAgentEventsWall('founder_1')
    expect(res.source).toBe('connected')
    expect(res.events.map((e) => e.id)).toEqual(['evt_2', 'evt_1'])
  })
})

describe('isMissingTableError', () => {
  it('recognises PostgREST schema-cache and Postgres relation-missing shapes', () => {
    expect(isMissingTableError("Could not find the table 'public.cc_agent_events' in the schema cache")).toBe(true)
    expect(isMissingTableError('relation "cc_agent_events" does not exist')).toBe(true)
    expect(isMissingTableError('42P01')).toBe(true)
    expect(isMissingTableError('PGRST205')).toBe(true)
  })

  it('does not swallow unrelated failures as "table missing"', () => {
    expect(isMissingTableError('rls denied')).toBe(false)
    expect(isMissingTableError('JWT expired')).toBe(false)
  })
})

describe('eventVerb — UNI-2384 taxonomy', () => {
  it('reads runner lifecycle verbs from tool_name on status events', () => {
    expect(eventVerb({ event_type: 'status', tool_name: 'claimed' })).toBe('claimed')
    expect(eventVerb({ event_type: 'status', tool_name: 'draft_pr_opened' })).toBe('draft_pr_opened')
  })

  it('labels heartbeats as heartbeat regardless of tool_name', () => {
    expect(eventVerb({ event_type: 'heartbeat', tool_name: null })).toBe('heartbeat')
  })

  it('falls back to the event_type when tool_name is absent', () => {
    expect(eventVerb({ event_type: 'status', tool_name: null })).toBe('status')
    expect(eventVerb({ event_type: 'tool_call', tool_name: null })).toBe('tool_call')
  })
})

describe('relativeAge — plain, never fake-live', () => {
  const now = Date.parse('2026-07-16T10:00:00.000Z')

  it('renders seconds / minutes / hours / days plainly', () => {
    expect(relativeAge('2026-07-16T09:59:30.000Z', now)).toBe('just now')
    expect(relativeAge('2026-07-16T09:56:00.000Z', now)).toBe('4m ago')
    expect(relativeAge('2026-07-16T07:00:00.000Z', now)).toBe('3h ago')
    expect(relativeAge('2026-07-14T10:00:00.000Z', now)).toBe('2d ago')
  })

  it('degrades malformed or absent timestamps to an em dash', () => {
    expect(relativeAge('not-a-date', now)).toBe('—')
    expect(relativeAge(null, now)).toBe('—')
    expect(relativeAge(undefined, now)).toBe('—')
  })
})
