#!/usr/bin/env node

/**
 * /stage — the Mission Control "Projects by stage" board, in the CLI.
 *
 * One row per Linear team, carrying exactly one of the founder's five words —
 * Planning · Research · Develop · Production · Done — the open-issue count
 * behind every word, and the next issue in the team's current stage. The deck
 * tile (apps/web/src/app/(founder)/founder/command-centre/StageBoardTile.tsx)
 * shows the same table; both read the mapping from
 * apps/web/data/command-centre/stage-map.json, and a parity test in apps/web
 * asserts this file's rules agree with the TypeScript ones.
 *
 * Usage:
 *   node scripts/stage.mjs          # table
 *   node scripts/stage.mjs --json   # machine-readable
 *
 * LINEAR_API_KEY comes from the environment. If unset, the key is resolved
 * from ~/.hermes/.env and attached to the request header only — it is never
 * printed. No key → exit 2 with a plain message, never an empty board.
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const STAGE_MAP_PATH = join(repositoryRoot, 'apps', 'web', 'data', 'command-centre', 'stage-map.json')

const LINEAR_GQL = 'https://api.linear.app/graphql'
const PAGE_SIZE = 250
const MAX_PAGES = 4
const TEAMS_PAGE_SIZE = 50
/** Beyond 4 × 50 teams the read fails: a truncated board reads as "those teams have nothing open". */
const MAX_TEAM_PAGES = 4

export function loadStageMap(path = STAGE_MAP_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

// ─── Pure stage rules (mirror of project-stages.ts) ────────────────────────

export function classifyIssue(issue, map) {
  const word = map.byStateName[issue.stateName] ?? map.byStateType[issue.stateType] ?? null
  if (word === 'Planning') {
    const re = new RegExp(map.researchLabelPattern, 'i')
    if (issue.labelNames.some((label) => re.test(label))) return 'Research'
  }
  return word
}

function priorityRank(priority) {
  return priority === 0 ? 5 : priority
}

export function sortByPriority(issues) {
  return [...issues].sort((a, b) => {
    const rank = priorityRank(a.priority) - priorityRank(b.priority)
    if (rank !== 0) return rank
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function summariseTeam(key, name, issues, capped, map) {
  const counts = { Planning: 0, Research: 0, Develop: 0, Production: 0 }
  const byStage = { Planning: [], Research: [], Develop: [], Production: [] }
  const unmapped = new Set()
  for (const issue of issues) {
    const word = classifyIssue(issue, map)
    if (word === null) {
      unmapped.add(issue.stateName)
      continue
    }
    counts[word] += 1
    byStage[word].push(issue)
  }
  const active = map.activeOrder.find((word) => counts[word] > 0) ?? null
  const stage = active ?? 'Done'
  const next = active ? (sortByPriority(byStage[active])[0] ?? null) : null
  return { key, name, stage, open: issues.length, counts, next, unmapped: [...unmapped].sort(), capped }
}

export function toStageIssue(n) {
  if (typeof n !== 'object' || n === null) return null
  if (
    typeof n.id !== 'string' ||
    typeof n.identifier !== 'string' ||
    typeof n.title !== 'string' ||
    typeof n.priority !== 'number' ||
    typeof n.updatedAt !== 'string'
  ) {
    return null
  }
  // No readable state → no classification. Same rule as project-stages.ts.
  const state = n.state
  if (typeof state !== 'object' || state === null || typeof state.name !== 'string' || typeof state.type !== 'string') return null
  // Labels decide Research vs Planning; an unreadable label list refuses the node.
  const labels = n.labels
  if (typeof labels !== 'object' || labels === null || !Array.isArray(labels.nodes)) return null
  const labelNames = []
  for (const l of labels.nodes) {
    if (typeof l?.name !== 'string') return null
    labelNames.push(l.name)
  }
  return {
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    priority: n.priority,
    url: typeof n.url === 'string' ? n.url : '',
    updatedAt: n.updatedAt,
    stateName: state.name,
    stateType: state.type,
    labelNames,
  }
}

// ─── Linear fetch ───────────────────────────────────────────────────────────

const TEAMS_QUERY = `query StageTeams($after: String) {
  teams(first: ${TEAMS_PAGE_SIZE}, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { key name }
  }
}`
const TEAM_OPEN_ISSUES_QUERY = `query StageTeamOpenIssues($team: String!, $after: String) {
  issues(
    first: ${PAGE_SIZE}
    after: $after
    filter: { team: { key: { eq: $team } }, completedAt: { null: true }, canceledAt: { null: true } }
    orderBy: updatedAt
  ) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id identifier title priority url updatedAt
      state { name type }
      labels { nodes { name } }
    }
  }
}`

/** The key is read for the request header only. It is never logged or returned. */
export function resolveApiKey(env = process.env, hermesEnvPath = join(homedir(), '.hermes', '.env')) {
  const fromEnv = env.LINEAR_API_KEY?.trim()
  if (fromEnv) return fromEnv
  let raw
  try {
    raw = readFileSync(hermesEnvPath, 'utf8')
  } catch {
    return undefined
  }
  for (const line of raw.split(/\r?\n/u)) {
    const m = /^\s*(?:export\s+)?LINEAR_API_KEY\s*=\s*"?([^"\s#]+)"?/u.exec(line)
    if (m) return m[1]
  }
  return undefined
}

/**
 * pageInfo is a contract (mirror of project-stages.ts): hasNextPage must be a
 * boolean and true must carry a non-empty cursor. Returns the next cursor, or
 * null on the last page; throws on anything else.
 */
export function readPageInfo(info, label, seenCursors) {
  if (typeof info !== 'object' || info === null) throw new Error(`Linear malformed response: ${label}: missing pageInfo`)
  if (typeof info.hasNextPage !== 'boolean') throw new Error(`Linear malformed response: ${label}: pageInfo.hasNextPage is not a boolean`)
  if (!info.hasNextPage) return null
  if (typeof info.endCursor !== 'string' || info.endCursor === '') throw new Error(`Linear malformed response: ${label}: hasNextPage without an endCursor`)
  // A cursor that repeats re-reads the same page: one issue would count once per page.
  if (seenCursors.has(info.endCursor)) throw new Error(`Linear malformed response: ${label}: pagination cursor did not advance`)
  seenCursors.add(info.endCursor)
  return info.endCursor
}

async function postGraphQL(apiKey, query, variables, fetchImpl) {
  const res = await fetchImpl(LINEAR_GQL, {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Linear HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors || !json.data) throw new Error(`Linear graphql error: ${JSON.stringify(json.errors ?? json).slice(0, 200)}`)
  return json.data
}

export async function fetchTeamStages({ apiKey, fetchImpl = fetch, map = loadStageMap(), now = () => new Date() } = {}) {
  if (!apiKey) return { ok: 'not_configured' }
  const teams = []
  const keys = new Set()
  let teamsAfter = null
  const teamCursors = new Set()
  let complete = false
  for (let page = 0; page < MAX_TEAM_PAGES && !complete; page += 1) {
    const data = await postGraphQL(apiKey, TEAMS_QUERY, { after: teamsAfter }, fetchImpl)
    if (!Array.isArray(data.teams?.nodes)) throw new Error('Linear malformed response: missing teams.nodes')
    for (const team of data.teams.nodes) {
      // Same rule as project-stages.ts: a team or issue node the validator cannot
      // read fails the whole read. A dropped row reads as "nothing open".
      if (typeof team?.key !== 'string' || typeof team?.name !== 'string') {
        throw new Error('Linear malformed response: a team node lacks key or name')
      }
      // A key seen twice means overlapping pages: two rows for one team breaks the contract.
      if (keys.has(team.key)) throw new Error(`Linear malformed response: team ${team.key} appears more than once`)
      keys.add(team.key)
      teams.push(team)
    }
    teamsAfter = readPageInfo(data.teams.pageInfo, 'teams', teamCursors)
    complete = teamsAfter === null
  }
  if (!complete) throw new Error(`Linear returned more than ${MAX_TEAM_PAGES * TEAMS_PAGE_SIZE} Linear teams: the board would be incomplete`)
  const rows = []
  for (const team of teams) {
    const issues = []
    let after = null
    const cursors = new Set()
    let capped = true
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const data = await postGraphQL(apiKey, TEAM_OPEN_ISSUES_QUERY, { team: team.key, after }, fetchImpl)
      for (const node of data.issues.nodes) {
        const issue = toStageIssue(node)
        if (!issue) throw new Error(`Linear malformed response: ${team.key}: malformed issue node`)
        issues.push(issue)
      }
      const next = readPageInfo(data.issues.pageInfo, team.key, cursors)
      if (next === null) {
        capped = false
        break
      }
      after = next
    }
    rows.push(summariseTeam(team.key, team.name, issues, capped, map))
  }
  rows.sort((a, b) => a.name.localeCompare(b.name))
  return { ok: true, checkedAt: now().toISOString(), teams: rows }
}

export function renderTable(result) {
  const lines = []
  const pad = (s, n) => String(s).padEnd(n)
  lines.push(`${pad('TEAM', 6)}${pad('NAME', 16)}${pad('STAGE', 12)}${pad('PLANNING', 10)}${pad('RESEARCH', 10)}${pad('DEVELOP', 9)}${pad('PRODUCTION', 12)}NEXT`)
  for (const t of result.teams) {
    const next = t.next ? `${t.next.identifier} ${t.next.title}` : 'nothing open'
    const cap = t.capped ? '+' : ''
    lines.push(
      `${pad(t.key, 6)}${pad(t.name.slice(0, 15), 16)}${pad(t.stage, 12)}${pad(t.counts.Planning + cap, 10)}${pad(t.counts.Research, 10)}${pad(t.counts.Develop, 9)}${pad(t.counts.Production, 12)}${next.slice(0, 70)}`,
    )
    if (t.unmapped.length > 0) lines.push(`      unmapped states: ${t.unmapped.join(', ')}`)
  }
  lines.push(`checked ${result.checkedAt} · word = furthest-along stage with open work · map: ${STAGE_MAP_PATH}`)
  return lines.join('\n')
}

export async function main(argv = process.argv.slice(2)) {
  const apiKey = resolveApiKey()
  const result = await fetchTeamStages({ apiKey })
  if (result.ok === 'not_configured') {
    console.error('LINEAR_API_KEY is not set in this shell and was not found in ~/.hermes/.env. No stage can be read.')
    return 2
  }
  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(renderTable(result))
  }
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`stage: ${error.message}`)
      process.exit(1)
    },
  )
}
