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

function linearMock(pagesByTeam: Record<string, unknown[][]>, teams = Object.keys(pagesByTeam)): MinimalFetch {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { query: string; variables: { team?: string; after?: string | null } }
    if (body.query.includes('StageTeams')) {
      return { ok: true, status: 200, json: async () => ({ data: { teams: { nodes: teams.map((key) => ({ key, name: `Team ${key}` })) } } }) }
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
    const page = Array.from({ length: 3 }, (_, i) => rawNode(`RA-${i}`, 'Backlog', 'backlog'))
    const fetchImpl = linearMock({ RA: [page, page, page, page, page] })
    const result = await fetchTeamStages({ apiKey: 'k', fetchImpl })
    if (result.ok !== true) throw new Error('expected ok')
    expect(result.teams[0].capped).toBe(true)
    expect(result.teams[0].open).toBe(12)
  })

  it('fails the whole read when one team fails — a missing row would read as "nothing open"', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { query: string; variables: { team?: string } }
      if (body.query.includes('StageTeams')) {
        return { ok: true, status: 200, json: async () => ({ data: { teams: { nodes: [{ key: 'A', name: 'A' }, { key: 'B', name: 'B' }] } } }) }
      }
      if (body.variables.team === 'B') return { ok: false, status: 502, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ data: { issues: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } } }) }
    })
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl })).toEqual({ ok: false, error: 'B: HTTP 502' })
  })

  it('surfaces HTTP and GraphQL errors honestly', async () => {
    const http = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: http })).toEqual({ ok: false, error: 'HTTP 401' })
    const gql = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ errors: [{ message: 'x' }] }) }))
    expect(await fetchTeamStages({ apiKey: 'k', fetchImpl: gql })).toEqual({ ok: false, error: 'graphql error' })
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
})
