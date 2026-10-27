import { describe, expect, it } from 'vitest'
import { isDesignLessonsArmed } from '../arming'
import { loadPreferredEdition } from '../preferred'
import { loadLatestLessons, loadRecentEvents, recordDesignEvent, saveLessons, isUndefinedTable } from '../store'
import { summarizeLessons } from '../lessons'

type Result = { data: unknown; error: unknown }
function fakeClient(results: Record<string, Result[]> = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const from = (table: string) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'insert', 'gte', 'order', 'limit', 'maybeSingle', 'eq']) {
      b[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args })
        return b
      }
    }
    b.then = (res: (r: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(results[table]?.shift() ?? { data: null, error: null }).then(res, rej)
    return b
  }
  return { client: { from } as never, calls }
}

const lessons = summarizeLessons(Array.from({ length: 3 }, () => ({ system: 'card' as const, template: 'forge', action: 'approved' as const })))

describe('arming', () => {
  it('is dormant unless DESIGN_LESSONS_LIVE is exactly 1', () => {
    expect(isDesignLessonsArmed({} as NodeJS.ProcessEnv)).toBe(false)
    expect(isDesignLessonsArmed({ DESIGN_LESSONS_LIVE: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(isDesignLessonsArmed({ DESIGN_LESSONS_LIVE: '1' } as unknown as NodeJS.ProcessEnv)).toBe(true)
  })
})

describe('owner scoping', () => {
  it('reads only the founder\'s own lessons and events', async () => {
    const { client, calls } = fakeClient()
    await loadLatestLessons(client, 'founder-1')
    await loadRecentEvents(client, 'founder-1')
    for (const table of ['design_lessons', 'design_events']) {
      expect(calls.filter((c) => c.table === table && c.method === 'eq').map((c) => c.args), table).toContainEqual(['founder_id', 'founder-1'])
    }
  })

  it('pre-selects nothing, and opens no client, when FOUNDER_USER_ID is unset', async () => {
    let made = 0
    const env = { DESIGN_LESSONS_LIVE: '1' } as unknown as NodeJS.ProcessEnv
    expect(await loadPreferredEdition(env, () => { made++; return fakeClient().client })).toBeNull()
    expect(made).toBe(0)
  })
})

describe('store', () => {
  it('writes the founder id from the session, never the payload', async () => {
    const { client, calls } = fakeClient()
    await recordDesignEvent(client, 'founder-1', { system: 'card', template: 'forge', action: 'rejected', reason: 'too dark' })
    const insert = calls.find((c) => c.method === 'insert')
    expect(insert?.table).toBe('design_events')
    expect(insert?.args[0]).toMatchObject({ founder_id: 'founder-1', template: 'forge', action: 'rejected', reason: 'too dark', edits: [] })
  })

  it('saves a lessons snapshot with its event count', async () => {
    const { client, calls } = fakeClient()
    await saveLessons(client, 'founder-1', lessons, 3)
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({ founder_id: 'founder-1', event_count: 3, lessons })
  })

  it('reads the latest snapshot, or [] when there is none', async () => {
    const { client } = fakeClient({ design_lessons: [{ data: { lessons }, error: null }, { data: null, error: null }] })
    expect(await loadLatestLessons(client, 'founder-1')).toEqual(lessons)
    expect(await loadLatestLessons(client, 'founder-1')).toEqual([])
  })

  it('recognises a missing table', () => {
    expect(isUndefinedTable({ code: '42P01' })).toBe(true)
    expect(isUndefinedTable({ code: 'PGRST205' })).toBe(true)
    expect(isUndefinedTable({ code: '23505' })).toBe(false)
  })
})

describe('loadPreferredEdition', () => {
  const armed = { DESIGN_LESSONS_LIVE: '1', FOUNDER_USER_ID: ' founder-1 ' } as unknown as NodeJS.ProcessEnv

  it('returns null and reads nothing when unarmed', async () => {
    let made = 0
    const got = await loadPreferredEdition({} as NodeJS.ProcessEnv, () => {
      made += 1
      return fakeClient().client
    })
    expect(got).toBeNull()
    expect(made).toBe(0)
  })

  it('returns the learned edition when armed', async () => {
    const { client, calls } = fakeClient({ design_lessons: [{ data: { lessons }, error: null }] })
    expect(await loadPreferredEdition(armed, () => client)).toBe('forge')
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['founder_id', 'founder-1'])
  })

  it('falls back to null on any read error', async () => {
    const { client } = fakeClient({ design_lessons: [{ data: null, error: { code: '42P01' } }] })
    expect(await loadPreferredEdition(armed, () => client)).toBeNull()
    expect(await loadPreferredEdition(armed, () => { throw new Error('no env') })).toBeNull()
  })
})
