// src/lib/command-centre/__tests__/project-stages.test.ts
//
// Mission Control Day 1 — "Projects by stage". Pure rules, the paginated
// Linear fetch, and a PARITY test against the CLI (scripts/stage.mjs).

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  classifyIssue,
  fetchTeamStages,
  STAGE_MAP,
  summariseTeam,
  toStageIssue,
  type MinimalFetch,
  type StageIssue,
} from '@/lib/command-centre/project-stages'

function issue(over: Partial<StageIssue> = {}): StageIssue {
  return {
    id: over.identifier ?? 'id',
    identifier: 'UNI-1',
    title: 'Some issue',
    priority: 3,
    url: 'https://linear.app/x/issue/UNI-1',
    updatedAt: '2026-08-01T00:00:00.000Z',
    stateName: 'Todo',
    stateType: 'unstarted',
    labelNames: [],
    ...over,
  }
}

describe('stage map', () => {
  it('carries exactly the five founder words', () => {
    expect(STAGE_MAP.words).toEqual(['Planning', 'Research', 'Develop', 'Production', 'Done'])
  })
  it('maps every state name read from Linear on 03/09/2026', () => {
    for (const name of ['Backlog', 'Todo', 'Ready for Pi-Dev', 'In Progress', 'Pi-Dev: In Progress', 'Pi-Dev: Blocked', 'In Review']) {
      expect(STAGE_MAP.byStateName[name]).toBeDefined()
    }
  })
})

describe('classifyIssue', () => {
  it('maps by state name first, then by state type', () => {
    expect(classifyIssue(issue({ stateName: 'In Review', stateType: 'started' }))).toBe('Production')
    expect(classifyIssue(issue({ stateName: 'Pi-Dev: Blocked', stateType: 'started' }))).toBe('Develop')
    expect(classifyIssue(issue({ stateName: 'Some New State', stateType: 'started' }))).toBe('Develop')
    expect(classifyIssue(issue({ stateName: 'Some New State', stateType: 'mystery' }))).toBeNull()
  })
  it('promotes a Planning issue with a research-type label to Research, and only Planning', () => {
    expect(classifyIssue(issue({ stateName: 'Todo', labelNames: ['Research'] }))).toBe('Research')
    expect(classifyIssue(issue({ stateName: 'Backlog', labelNames: ['spike: auth'] }))).toBe('Research')
    expect(classifyIssue(issue({ stateName: 'In Progress', stateType: 'started', labelNames: ['research'] }))).toBe('Develop')
  })
})

describe('summariseTeam', () => {
  it('picks the furthest-along stage with open work and the top-priority issue in it', () => {
    const row = summariseTeam(
      'UNI',
      'Unite-Group',
      [
        issue({ identifier: 'UNI-1', stateName: 'Backlog', stateType: 'backlog' }),
        issue({ identifier: 'UNI-2', stateName: 'In Progress', stateType: 'started', priority: 3 }),
        issue({ identifier: 'UNI-3', stateName: 'In Progress', stateType: 'started', priority: 1 }),
        issue({ identifier: 'UNI-4', stateName: 'Todo', labelNames: ['research'] }),
      ],
      false,
    )
    expect(row.stage).toBe('Develop')
    expect(row.counts).toEqual({ Planning: 1, Research: 1, Develop: 2, Production: 0 })
    expect(row.next?.identifier).toBe('UNI-3')
    expect(row.open).toBe(4)
    expect(row.unmapped).toEqual([])
  })
  it('is Done with nothing open, and reports unmapped states rather than guessing', () => {
    expect(summariseTeam('DR', 'DR', [], false).stage).toBe('Done')
    const row = summariseTeam('DR', 'DR', [issue({ stateName: 'Limbo', stateType: 'mystery' })], false)
    expect(row.stage).toBe('Done')
    expect(row.unmapped).toEqual(['Limbo'])
    expect(row.open).toBe(1)
  })
})

const LAST_PAGE = { hasNextPage: false, endCursor: null }

function linearMock(pagesByTeam: Record<string, unknown[][]>, teams = Object.keys(pagesByTeam)): MinimalFetch {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { query: string; variables: { team?: string; after?: string | null } }
    if (body.query.includes('StageTeams')) {
      return { ok: true, status: 200, json: async () => ({ data: { teams: { pageInfo: LAST_PAGE, nodes: teams.map((key) => ({ key, name: `Team ${key}` })) } } }) }
    }
    const pages = pagesByTeam[body.variables.team ?? ''] ?? [[]]
    const index = body.variables.after ? Number(body.variables.after) : 0
    const nodes = pages[index] ?? []
    const hasNextPage = index + 1 < pages.length
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { issues: { pageInfo: { hasNextPage, endCursor: hasNextPage ? String(index + 1) : null }, nodes } } }),
    }
  })
}

const rawNode = (identifier: string, stateName: string, stateType: string) => ({
  id: identifier,
  identifier,
  title: 't',
  priority: 2,
  url: '',
  updatedAt: '2026-08-01T00:00:00.000Z',
  state: { name: stateName, type: stateType },
  labels: { nodes: [] },
})

describe('fetchTeamStages', () => {
  it('returns not_configured without a key and never calls fetch', async () => {
    const fetchImpl = vi.fn()
    expect(await fetchTeamStages({ apiKey: undefined, fetchImpl: fetchImpl as unknown as MinimalFetch })).toEqual({ ok: 'not_configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('paginates every team, sorts rows by name, and stamps checkedAt', async () => {
    const fetchImpl = linearMock({
      UNI: [[rawNode('UNI-1', 'Backlog', 'backlog')], [rawNode('UNI-2', 'In Review', 'started')]],
      DR: [[]],
    })
    const result = await fetchTeamStages({ apiKey: 'k', fetchImpl, now: () => new Date('2026-09-03T00:00:00Z') })
    expect(result.ok).toBe(true)
    if (result.ok !== true) return
    expect(result.checkedAt).toBe('2026-09-03T00:00:00.000Z')
    expect(result.teams.map((t) => [t.key, t.stage, t.open, t.capped])).toEqual([
      ['DR', 'Done', 0, false],
      ['UNI', 'Production', 2, false],
    ])
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('marks a team capped after four pages instead of reporting a floor as a total', async () => {
    const pages = Array.from({ length: 5 }, (_, p) => Array.from({ length: 3 }, (_, i) => rawNode(`RA-${p}-${i}`, 'Backlog', 'backlog')))
    const fetchImpl = linearMock({ RA: pages })
    const result = await fetchTeamStages({ apiKey: 'k', fetchImpl })
    if (result.ok !== true) throw new Error('expected ok')
    expect(result.teams[0].capped).toBe(true)
    expect(result.teams[0].open).toBe(12)
  })

  it('fails the whole read when one team fails — a missing row would read as "nothing open"', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string; variables: { team?: string } }
      if (body.query.includes('StageTeams')) {
        return { ok: true, status: 200, json: async () => ({ data: { teams: { pageInfo: LAST_PAGE, nodes: [{ key: 'A', name: 'A' }, { key: 'B', name: 'B' }] } } }) }
      }
      if (body.variables.team === 'B') return { ok: false, status: 502, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } } }) }
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'B: HTTP 502' })
  })

  it('fails the whole read when a team node lacks key or name — a dropped row reads as "nothing open" (review round 1, P1)', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string }
      if (body.query.includes('StageTeams')) {
        return { ok: true, status: 200, json: async () => ({ data: { teams: { pageInfo: LAST_PAGE, nodes: [{ key: 'A', name: 'A' }, { key: 'B' }] } } }) }
      }
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } } }) }
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'malformed response: a team node lacks key or name' })
  })

  it('fails the whole read when an issue node cannot be validated, naming the team (review round 1, P1)', async () => {
    const fetchImpl = linearMock({ RA: [[rawNode('RA-1', 'In Progress', 'started'), { id: 'x', identifier: 'RA-2' }]] })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'RA: malformed issue node in Linear response' })
  })

  it('surfaces HTTP and GraphQL errors honestly', async () => {
    const http = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: http })).toEqual({ ok: false, error: 'HTTP 401' })
    const gql = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ errors: [{ message: 'x' }] }) }))
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: gql })).toEqual({ ok: false, error: 'graphql error' })
  })
})

// ─── Review round 2 (codex, head c0c697881): three P1s, each watched red first ───

/** Teams come back page by page keyed on `after`; every team has no open issues unless `issuePage` says otherwise. */
function pagedTeamsMock(teamPages: Array<{ nodes: unknown[]; pageInfo: unknown }>, issuePage: unknown = { pageInfo: LAST_PAGE, nodes: [] }): MinimalFetch {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { query: string; variables: { after?: string | null } }
    if (body.query.includes('StageTeams')) {
      const index = body.variables.after ? Number(body.variables.after) : 0
      return { ok: true, status: 200, json: async () => ({ data: { teams: teamPages[index] } }) }
    }
    return { ok: true, status: 200, json: async () => ({ data: { issues: issuePage } }) }
  })
}

const teamPage = (from: number, count: number, pageInfo: unknown) => ({
  nodes: Array.from({ length: count }, (_, i) => ({ key: `T${from + i}`, name: `Team ${String(from + i).padStart(3, '0')}` })),
  pageInfo,
})

describe('fetchTeamStages — review round 2 findings', () => {
  it('reads a second page of teams, so the 51st team is on the board (P1-STAGE-BOARD-TEAM-PAGINATION-SILENTLY-TRUNCATES)', async () => {
    const fetchImpl = pagedTeamsMock([teamPage(0, 50, { hasNextPage: true, endCursor: '1' }), teamPage(50, 1, LAST_PAGE)])
    const result = await fetchTeamStages({ apiKey: 'k', fetchImpl })
    if (result.ok !== true) throw new Error(`expected ok, got ${JSON.stringify(result)}`)
    expect(result.teams).toHaveLength(51)
    expect(result.teams.map((t) => t.key)).toContain('T50')
    const teamCalls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls.filter(([, init]) => String((init as RequestInit).body).includes('StageTeams'))
    expect(teamCalls).toHaveLength(2)
    expect(JSON.parse(String((teamCalls[1][1] as RequestInit).body)).variables).toEqual({ after: '1' })
  })

  it('fails closed above the team page cap instead of presenting a partial board as complete', async () => {
    let call = 0
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string }
      if (body.query.includes('StageTeams')) {
        const i = call++
        return { ok: true, status: 200, json: async () => ({ data: { teams: teamPage(i * 50, 50, { hasNextPage: true, endCursor: String(i + 1) }) } }) }
      }
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: LAST_PAGE, nodes: [] } } }) }
    })
    const result = await fetchTeamStages({ apiKey: 'k', fetchImpl })
    expect(result).toEqual({ ok: false, error: 'more than 200 Linear teams: the board would be incomplete' })
  })

  it('fails the whole read when the teams page carries no pageInfo, or hasNextPage without a cursor', async () => {
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: pagedTeamsMock([{ nodes: [{ key: 'A', name: 'A' }], pageInfo: undefined }]) })).toEqual({
      ok: false,
      error: 'teams: malformed response: missing pageInfo',
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: pagedTeamsMock([{ nodes: [{ key: 'A', name: 'A' }], pageInfo: { hasNextPage: true } }]) })).toEqual({
      ok: false,
      error: 'teams: malformed response: hasNextPage without an endCursor',
    })
  })

  it('fails the whole read when issue pageInfo is malformed — never a successful last page (P1-STAGE-BOARD-MALFORMED-PAGEINFO-TRUNCATES-ISSUES)', async () => {
    const one = [rawNode('RA-1', 'In Progress', 'started')]
    const withInfo = (pageInfo: unknown) => pagedTeamsMock([{ nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE }], { pageInfo, nodes: one })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: withInfo({ hasNextPage: true }) })).toEqual({
      ok: false,
      error: 'RA: malformed response: hasNextPage without an endCursor',
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: withInfo({ hasNextPage: true, endCursor: '' }) })).toEqual({
      ok: false,
      error: 'RA: malformed response: hasNextPage without an endCursor',
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: withInfo({ hasNextPage: 'yes', endCursor: 'c' }) })).toEqual({
      ok: false,
      error: 'RA: malformed response: pageInfo.hasNextPage is not a boolean',
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: withInfo(undefined) })).toEqual({
      ok: false,
      error: 'RA: malformed response: missing pageInfo',
    })
  })

  it('toStageIssue refuses an issue with no state, or a state lacking name or type (P1-STAGE-BOARD-MISSING-ISSUE-STATE-BECOMES-DONE)', () => {
    const base = rawNode('RA-1', 'Todo', 'unstarted')
    expect(toStageIssue(base)).not.toBeNull()
    expect(toStageIssue({ ...base, state: null })).toBeNull()
    expect(toStageIssue({ ...base, state: undefined })).toBeNull()
    expect(toStageIssue({ ...base, state: {} })).toBeNull()
    expect(toStageIssue({ ...base, state: { name: 'Todo' } })).toBeNull()
    expect(toStageIssue({ ...base, state: { type: 'unstarted' } })).toBeNull()
    expect(toStageIssue({ ...base, state: { name: 'Todo', type: 7 } })).toBeNull()
  })

  it('fails the whole read when an active issue has state=null — it must never read as Done', async () => {
    const fetchImpl = linearMock({ RA: [[{ ...rawNode('RA-1', 'In Progress', 'started'), state: null }]] })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'RA: malformed issue node in Linear response' })
  })
})

// ─── Review round 3 (codex, head ddc138c5e): three P1s, each watched red first ───

describe('fetchTeamStages — review round 3 findings', () => {
  const oneTeam = [{ nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE }]

  it('fails the whole read when an issue cursor does not advance — one issue can never count four times (P1-STAGE-BOARD-REPEATED-ISSUE-CURSOR-INFLATES-COUNTS)', async () => {
    let call = 0
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string }
      if (body.query.includes('StageTeams')) return { ok: true, status: 200, json: async () => ({ data: { teams: oneTeam[0] } }) }
      const i = call++
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage: true, endCursor: 'same' }, nodes: [rawNode(`RA-${i}`, 'Backlog', 'backlog')] } } }) }
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'RA: malformed response: pagination cursor did not advance' })
  })

  it('fails the whole read when a teams cursor does not advance', async () => {
    let call = 0
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string }
      if (body.query.includes('StageTeams')) {
        const i = call++
        return { ok: true, status: 200, json: async () => ({ data: { teams: { nodes: [{ key: `T${i}`, name: `T${i}` }], pageInfo: { hasNextPage: true, endCursor: 'same' } } } }) }
      }
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: LAST_PAGE, nodes: [] } } }) }
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'teams: malformed response: pagination cursor did not advance' })
  })

  it('fails the whole read when a team key repeats across pages — one row per team is the contract (P1-STAGE-BOARD-DUPLICATE-TEAM-PAGES-RETURN-DUPLICATE-ROWS)', async () => {
    const fetchImpl = pagedTeamsMock([
      { nodes: [{ key: 'RA', name: 'RA' }], pageInfo: { hasNextPage: true, endCursor: '1' } },
      { nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE },
    ])
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'malformed response: team RA appears more than once' })
  })

  it('toStageIssue refuses malformed labels — a lost label would turn Research into Planning (P1-STAGE-BOARD-MALFORMED-LABELS-SILENTLY-LOSE-RESEARCH)', () => {
    const base = rawNode('RA-1', 'Todo', 'unstarted')
    expect(toStageIssue({ ...base, labels: { nodes: [{ name: 'Research' }] } })?.labelNames).toEqual(['Research'])
    expect(toStageIssue({ ...base, labels: { nodes: [] } })?.labelNames).toEqual([])
    for (const labels of [undefined, null, {}, { nodes: 'bad' }, { nodes: [{}] }, { nodes: [null] }, { nodes: [{ name: 3 }] }]) {
      expect(toStageIssue({ ...base, labels }), JSON.stringify(labels)).toBeNull()
    }
  })

  it('fails the whole read through fetchTeamStages on malformed labels — Planning is never published in place of Research', async () => {
    const fetchImpl = pagedTeamsMock(oneTeam, { pageInfo: LAST_PAGE, nodes: [{ ...rawNode('RA-1', 'Todo', 'unstarted'), labels: null }] })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'RA: malformed issue node in Linear response' })
  })
})

// ─── Review round 4 (codex, head 7131580ee): one P1, watched red first ───

describe('fetchTeamStages — review round 4 finding', () => {
  const oneTeam = [{ nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE }]

  it('fails the whole read when one issue id appears twice across advancing pages — counts never inflate (P1-STAGE-BOARD-DUPLICATE-ISSUE-IDENTITY-INFLATES-COUNTS)', async () => {
    const fetchImpl = linearMock({ RA: [[rawNode('RA-1', 'Backlog', 'backlog')], [rawNode('RA-1', 'Backlog', 'backlog')]] })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'RA: malformed response: issue RA-1 appears more than once' })
  })

  it('fails the whole read when one issue id appears twice within a single page', async () => {
    const fetchImpl = pagedTeamsMock(oneTeam, { pageInfo: LAST_PAGE, nodes: [rawNode('RA-1', 'Backlog', 'backlog'), rawNode('RA-1', 'Todo', 'unstarted')] })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'RA: malformed response: issue RA-1 appears more than once' })
  })

  it('still reads two pages of distinct issues as two open issues', async () => {
    const fetchImpl = linearMock({ RA: [[rawNode('RA-1', 'Backlog', 'backlog')], [rawNode('RA-2', 'Backlog', 'backlog')]] })
    const result = await fetchTeamStages({ apiKey: 'k', fetchImpl })
    if (result.ok !== true) throw new Error(`expected ok, got ${JSON.stringify(result)}`)
    expect(result.teams[0].open).toBe(2)
  })
})

describe('PARITY with scripts/stage.mjs (the CLI)', () => {
  const fixture: StageIssue[] = [
    issue({ identifier: 'X-1', stateName: 'Backlog', stateType: 'backlog', priority: 0 }),
    issue({ identifier: 'X-2', stateName: 'Todo', labelNames: ['Discovery'] }),
    issue({ identifier: 'X-3', stateName: 'In Progress', stateType: 'started', priority: 2, updatedAt: '2026-08-02T00:00:00.000Z' }),
    issue({ identifier: 'X-4', stateName: 'In Progress', stateType: 'started', priority: 2, updatedAt: '2026-08-03T00:00:00.000Z' }),
    issue({ identifier: 'X-5', stateName: 'Pi-Dev: Blocked', stateType: 'started', priority: 1 }),
    issue({ identifier: 'X-6', stateName: 'Weird', stateType: 'mystery' }),
  ]

  it('classifies and summarises the same fixture identically, using the same stage-map.json', async () => {
    const cli = await import(pathToFileURL(path.resolve(process.cwd(), '..', '..', 'scripts', 'stage.mjs')).href)
    const cliMap = cli.loadStageMap()
    expect(cliMap).toEqual(STAGE_MAP)
    for (const i of fixture) expect(cli.classifyIssue(i, cliMap)).toBe(classifyIssue(i))
    expect(cli.summariseTeam('X', 'X', fixture, true, cliMap)).toEqual(summariseTeam('X', 'X', fixture, true))
    expect(cli.summariseTeam('X', 'X', [], false, cliMap)).toEqual(summariseTeam('X', 'X', [], false))
  })

  it('the CLI also refuses a malformed team or issue node instead of dropping it', async () => {
    const cli = await import(pathToFileURL(path.resolve(process.cwd(), '..', '..', 'scripts', 'stage.mjs')).href)
    const teamsOnly = (teams: unknown[], nodes: unknown[] = []) =>
      (async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { query: string }
        if (body.query.includes('StageTeams')) return { ok: true, status: 200, json: async () => ({ data: { teams: { pageInfo: LAST_PAGE, nodes: teams } } }) }
        return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } }) }
      }) as unknown as typeof fetch
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: teamsOnly([{ key: 'B' }]), map: STAGE_MAP })).rejects.toThrow(/team node lacks key or name/)
    await expect(
      cli.fetchTeamStages({ apiKey: 'k', fetchImpl: teamsOnly([{ key: 'RA', name: 'RA' }], [{ id: 'x', identifier: 'RA-2' }]), map: STAGE_MAP }),
    ).rejects.toThrow(/RA: malformed issue node/)
  })
  it('the CLI mirrors round 2: paginated teams, pageInfo as a contract, and no issue without a state', async () => {
    const cli = await import(pathToFileURL(path.resolve(process.cwd(), '..', '..', 'scripts', 'stage.mjs')).href)
    const paged = (teamPages: Array<{ nodes: unknown[]; pageInfo: unknown }>, issuePage: unknown = { pageInfo: LAST_PAGE, nodes: [] }) =>
      (async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { query: string; variables: { after?: string | null } }
        if (body.query.includes('StageTeams')) {
          const index = body.variables.after ? Number(body.variables.after) : 0
          return { ok: true, status: 200, json: async () => ({ data: { teams: teamPages[index] } }) }
        }
        return { ok: true, status: 200, json: async () => ({ data: { issues: issuePage } }) }
      }) as unknown as typeof fetch

    const twoPages = await cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged([teamPage(0, 50, { hasNextPage: true, endCursor: '1' }), teamPage(50, 1, LAST_PAGE)]), map: STAGE_MAP })
    expect(twoPages.teams).toHaveLength(51)

    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged(Array.from({ length: 5 }, (_, i) => teamPage(i * 50, 50, { hasNextPage: true, endCursor: String(i + 1) }))), map: STAGE_MAP })).rejects.toThrow(/more than 200 Linear teams/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged([{ nodes: [{ key: 'A', name: 'A' }], pageInfo: { hasNextPage: true } }]), map: STAGE_MAP })).rejects.toThrow(/hasNextPage without an endCursor/)

    const oneTeam = [{ nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE }]
    const one = [rawNode('RA-1', 'In Progress', 'started')]
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged(oneTeam, { pageInfo: { hasNextPage: true }, nodes: one }), map: STAGE_MAP })).rejects.toThrow(/RA: .*hasNextPage without an endCursor/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged(oneTeam, { pageInfo: { hasNextPage: 'yes', endCursor: 'c' }, nodes: one }), map: STAGE_MAP })).rejects.toThrow(/RA: .*hasNextPage is not a boolean/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged(oneTeam, { pageInfo: undefined, nodes: one }), map: STAGE_MAP })).rejects.toThrow(/RA: .*missing pageInfo/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged(oneTeam, { pageInfo: LAST_PAGE, nodes: [{ ...one[0], state: null }] }), map: STAGE_MAP })).rejects.toThrow(/RA: malformed issue node/)

    const base = rawNode('RA-1', 'Todo', 'unstarted')
    for (const state of [null, undefined, {}, { name: 'Todo' }, { type: 'unstarted' }]) {
      expect(cli.toStageIssue({ ...base, state })).toBe(toStageIssue({ ...base, state }))
      expect(cli.toStageIssue({ ...base, state })).toBeNull()
    }
  })
  it('the CLI mirrors round 3: a non-advancing cursor, a repeated team key, and malformed labels all refuse', async () => {
    const cli = await import(pathToFileURL(path.resolve(process.cwd(), '..', '..', 'scripts', 'stage.mjs')).href)
    const paged = (teamPages: Array<{ nodes: unknown[]; pageInfo: unknown }>, issuePage: unknown = { pageInfo: LAST_PAGE, nodes: [] }) =>
      (async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { query: string; variables: { after?: string | null } }
        if (body.query.includes('StageTeams')) {
          const index = body.variables.after ? Number(body.variables.after) : 0
          return { ok: true, status: 200, json: async () => ({ data: { teams: teamPages[index] ?? teamPages[0] } }) }
        }
        return { ok: true, status: 200, json: async () => ({ data: { issues: issuePage } }) }
      }) as unknown as typeof fetch
    const oneTeam = [{ nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE }]

    let call = 0
    const sameCursor = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string }
      if (body.query.includes('StageTeams')) return { ok: true, status: 200, json: async () => ({ data: { teams: oneTeam[0] } }) }
      const i = call++
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage: true, endCursor: 'same' }, nodes: [rawNode(`RA-${i}`, 'Backlog', 'backlog')] } } }) }
    }) as unknown as typeof fetch
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: sameCursor, map: STAGE_MAP })).rejects.toThrow(/RA: pagination cursor did not advance/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged([{ nodes: [{ key: 'A', name: 'A' }], pageInfo: { hasNextPage: true, endCursor: '1' } }, { nodes: [{ key: 'B', name: 'B' }], pageInfo: { hasNextPage: true, endCursor: '1' } }]), map: STAGE_MAP })).rejects.toThrow(/teams: pagination cursor did not advance/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged([{ nodes: [{ key: 'RA', name: 'RA' }], pageInfo: { hasNextPage: true, endCursor: '1' } }, { nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE }]), map: STAGE_MAP })).rejects.toThrow(/team RA appears more than once/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: paged(oneTeam, { pageInfo: LAST_PAGE, nodes: [{ ...rawNode('RA-1', 'Todo', 'unstarted'), labels: null }] }), map: STAGE_MAP })).rejects.toThrow(/RA: malformed issue node/)

    const base = rawNode('RA-1', 'Todo', 'unstarted')
    for (const labels of [undefined, null, {}, { nodes: 'bad' }, { nodes: [{}] }, { nodes: [null] }, { nodes: [{ name: 3 }] }]) {
      expect(cli.toStageIssue({ ...base, labels }), JSON.stringify(labels)).toBeNull()
      expect(cli.toStageIssue({ ...base, labels })).toBe(toStageIssue({ ...base, labels }))
    }
    expect(cli.toStageIssue({ ...base, labels: { nodes: [{ name: 'Research' }] } })).toEqual(toStageIssue({ ...base, labels: { nodes: [{ name: 'Research' }] } }))
  })
  it('the CLI mirrors round 4: a repeated issue id across or within pages refuses', async () => {
    const cli = await import(pathToFileURL(path.resolve(process.cwd(), '..', '..', 'scripts', 'stage.mjs')).href)
    const pages = (issuePages: unknown[][]) =>
      (async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { query: string; variables: { after?: string | null } }
        if (body.query.includes('StageTeams')) return { ok: true, status: 200, json: async () => ({ data: { teams: { nodes: [{ key: 'RA', name: 'RA' }], pageInfo: LAST_PAGE } } }) }
        const index = body.variables.after ? Number(body.variables.after) : 0
        const hasNextPage = index + 1 < issuePages.length
        return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage, endCursor: hasNextPage ? String(index + 1) : null }, nodes: issuePages[index] } } }) }
      }) as unknown as typeof fetch
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: pages([[rawNode('RA-1', 'Backlog', 'backlog')], [rawNode('RA-1', 'Backlog', 'backlog')]]), map: STAGE_MAP })).rejects.toThrow(/RA: issue RA-1 appears more than once/)
    await expect(cli.fetchTeamStages({ apiKey: 'k', fetchImpl: pages([[rawNode('RA-1', 'Backlog', 'backlog'), rawNode('RA-1', 'Todo', 'unstarted')]]), map: STAGE_MAP })).rejects.toThrow(/RA: issue RA-1 appears more than once/)
    const two = await cli.fetchTeamStages({ apiKey: 'k', fetchImpl: pages([[rawNode('RA-1', 'Backlog', 'backlog')], [rawNode('RA-2', 'Backlog', 'backlog')]]), map: STAGE_MAP })
    expect(two.teams[0].open).toBe(2)
  })
})
