// src/lib/command-centre/project-stages.ts
//
// Mission Control Day 1 — "Projects by stage": one row per Linear team,
// carrying exactly one of the founder's five words — Planning · Research ·
// Develop · Production · Done — plus the next issue in that stage.
//
// The state → word mapping lives in data/command-centre/stage-map.json and
// is shared with the CLI (`scripts/stage.mjs`); a parity test asserts the two
// implementations agree. Same plain-fetch, honest-state discipline as
// founder-workboard.ts: LINEAR_API_KEY is only ever attached to the outbound
// request header, an absent key is an explicit not_configured signal, and a
// failing call surfaces its error rather than a stale fallback.

import stageMap from '../../../data/command-centre/stage-map.json'

const LINEAR_GQL = 'https://api.linear.app/graphql'
const UPSTREAM_TIMEOUT_MS = 8000
const PAGE_SIZE = 250
/** 4 pages × 250 = 1,000 open issues per team before the row is marked `capped`. */
const MAX_PAGES = 4
const TEAMS_PAGE_SIZE = 50
/** 4 pages × 50 = 200 teams. Beyond that the read FAILS: a truncated board reads as "those teams have nothing open". */
const MAX_TEAM_PAGES = 4

export type StageWord = 'Planning' | 'Research' | 'Develop' | 'Production' | 'Done'
export type ActiveStageWord = Exclude<StageWord, 'Done'>

export interface StageMap {
  words: StageWord[]
  byStateName: Record<string, ActiveStageWord>
  byStateType: Record<string, ActiveStageWord>
  researchLabelPattern: string
  activeOrder: ActiveStageWord[]
}

export const STAGE_MAP: StageMap = stageMap as StageMap

export interface StageIssue {
  id: string
  identifier: string
  title: string
  priority: number
  url: string
  updatedAt: string
  stateName: string
  stateType: string
  labelNames: string[]
}

export interface TeamStage {
  key: string
  name: string
  stage: StageWord
  open: number
  counts: Record<ActiveStageWord, number>
  next: StageIssue | null
  /** State names seen on open issues that the stage map does not know. Reported, never guessed. */
  unmapped: string[]
  /** True when the team has more open issues than MAX_PAGES × PAGE_SIZE — counts are a floor. */
  capped: boolean
}

export type TeamStagesResult =
  | { ok: true; checkedAt: string; teams: TeamStage[] }
  | { ok: false; error: string }
  | { ok: 'not_configured' }

export type MinimalFetch = (
  input: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface ProjectStagesDeps {
  /** Defaults to process.env.LINEAR_API_KEY?.trim(). Inject for tests. */
  apiKey?: string
  /** Defaults to the global fetch. Inject for tests. */
  fetchImpl?: MinimalFetch
  now?: () => Date
}

// ─── Pure stage rules (mirrored in scripts/stage.mjs) ──────────────────────

/** One issue → one active word, or null when the stage map does not know its state. */
export function classifyIssue(issue: StageIssue, map: StageMap = STAGE_MAP): ActiveStageWord | null {
  const word = map.byStateName[issue.stateName] ?? map.byStateType[issue.stateType] ?? null
  if (word === 'Planning') {
    const re = new RegExp(map.researchLabelPattern, 'i')
    if (issue.labelNames.some((label) => re.test(label))) return 'Research'
  }
  return word
}

function priorityRank(priority: number): number {
  return priority === 0 ? 5 : priority
}

/** Urgent → High → Normal → Low → none; ties by most recently updated. */
export function sortByPriority(issues: StageIssue[]): StageIssue[] {
  return [...issues].sort((a, b) => {
    const rank = priorityRank(a.priority) - priorityRank(b.priority)
    if (rank !== 0) return rank
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

/**
 * The team's word is the FURTHEST-ALONG stage that has any open issue
 * (Production before Develop before Research before Planning), because that
 * is where the team's current work is; a team with nothing open is Done.
 * `next` is the top-priority open issue in that stage.
 */
export function summariseTeam(
  key: string,
  name: string,
  issues: StageIssue[],
  capped: boolean,
  map: StageMap = STAGE_MAP,
): TeamStage {
  const counts: Record<ActiveStageWord, number> = { Planning: 0, Research: 0, Develop: 0, Production: 0 }
  const byStage: Record<ActiveStageWord, StageIssue[]> = { Planning: [], Research: [], Develop: [], Production: [] }
  const unmapped = new Set<string>()
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
  const stage: StageWord = active ?? 'Done'
  const next = active ? (sortByPriority(byStage[active])[0] ?? null) : null
  return { key, name, stage, open: issues.length, counts, next, unmapped: [...unmapped].sort(), capped }
}

// ─── Linear fetch ───────────────────────────────────────────────────────────

function resolveApiKey(deps: ProjectStagesDeps): string | undefined {
  if (Object.prototype.hasOwnProperty.call(deps, 'apiKey')) return deps.apiKey?.trim()
  return process.env.LINEAR_API_KEY?.trim()
}

async function postGraphQL<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: MinimalFetch,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(LINEAR_GQL, {
      method: 'POST',
      headers: { authorization: apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const json = (await res.json()) as { data?: T; errors?: unknown }
    if (json.errors || !json.data) return { ok: false, error: 'graphql error' }
    return { ok: true, data: json.data }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return { ok: false, error: timedOut ? 'timeout' : err instanceof Error ? err.message : 'fetch failed' }
  }
}

export const TEAMS_QUERY = `query StageTeams($after: String) {
  teams(first: ${TEAMS_PAGE_SIZE}, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { key name }
  }
}`

export const TEAM_OPEN_ISSUES_QUERY = `query StageTeamOpenIssues($team: String!, $after: String) {
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

interface RawIssueNode {
  id?: unknown
  identifier?: unknown
  title?: unknown
  priority?: unknown
  url?: unknown
  updatedAt?: unknown
  state?: unknown
  labels?: { nodes?: Array<{ name?: unknown } | null> } | null
}

/**
 * pageInfo is a contract, not a hint: hasNextPage must be a boolean, and true
 * must carry a non-empty cursor. Anything else fails the read — treating a
 * malformed page as the last one is how counts go silently short.
 */
function readPageInfo(info: unknown): { ok: true; next: string | null } | { ok: false; error: string } {
  if (typeof info !== 'object' || info === null) return { ok: false, error: 'malformed response: missing pageInfo' }
  const p = info as { hasNextPage?: unknown; endCursor?: unknown }
  if (typeof p.hasNextPage !== 'boolean') return { ok: false, error: 'malformed response: pageInfo.hasNextPage is not a boolean' }
  if (!p.hasNextPage) return { ok: true, next: null }
  if (typeof p.endCursor !== 'string' || p.endCursor === '') return { ok: false, error: 'malformed response: hasNextPage without an endCursor' }
  return { ok: true, next: p.endCursor }
}

export function toStageIssue(node: unknown): StageIssue | null {
  if (typeof node !== 'object' || node === null) return null
  const n = node as RawIssueNode
  if (
    typeof n.id !== 'string' ||
    typeof n.identifier !== 'string' ||
    typeof n.title !== 'string' ||
    typeof n.priority !== 'number' ||
    typeof n.updatedAt !== 'string'
  ) {
    return null
  }
  // An open issue with no readable state cannot be classified; defaulting it to
  // empty strings made it "unmapped" and let a team with active work read Done.
  const state = n.state as { name?: unknown; type?: unknown } | null | undefined
  if (typeof state !== 'object' || state === null || typeof state.name !== 'string' || typeof state.type !== 'string') return null
  const labelNodes = Array.isArray(n.labels?.nodes) ? n.labels.nodes : []
  return {
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    priority: n.priority,
    url: typeof n.url === 'string' ? n.url : '',
    updatedAt: n.updatedAt,
    stateName: state.name,
    stateType: state.type,
    labelNames: labelNodes.map((l) => (l && typeof l.name === 'string' ? l.name : null)).filter((x): x is string => x !== null),
  }
}

interface RawIssuesPage {
  issues?: { pageInfo?: { hasNextPage?: unknown; endCursor?: unknown }; nodes?: unknown[] }
}

async function fetchTeamOpenIssues(
  apiKey: string,
  teamKey: string,
  fetchImpl: MinimalFetch,
): Promise<{ ok: true; issues: StageIssue[]; capped: boolean } | { ok: false; error: string }> {
  const issues: StageIssue[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await postGraphQL<RawIssuesPage>(apiKey, TEAM_OPEN_ISSUES_QUERY, { team: teamKey, after }, fetchImpl)
    if (!result.ok) return { ok: false, error: `${teamKey}: ${result.error}` }
    const nodes = result.data.issues?.nodes
    if (!Array.isArray(nodes)) return { ok: false, error: `${teamKey}: malformed response: missing issues.nodes` }
    for (const node of nodes) {
      const issue = toStageIssue(node)
      // A node the validator cannot read is a shape drift, not a skip: dropping
      // it can turn a team with open work into Done or pick the wrong next issue
      // while the read still reports ok. Fail the whole read and name the team.
      if (!issue) return { ok: false, error: `${teamKey}: malformed issue node in Linear response` }
      issues.push(issue)
    }
    const page = readPageInfo(result.data.issues?.pageInfo)
    if (!page.ok) return { ok: false, error: `${teamKey}: ${page.error}` }
    if (page.next === null) return { ok: true, issues, capped: false }
    after = page.next
  }
  return { ok: true, issues, capped: true }
}

interface RawTeamsPage {
  teams?: { pageInfo?: unknown; nodes?: unknown[] }
}

/** Every team, across pages. Above MAX_TEAM_PAGES the read fails rather than presenting a partial board as complete. */
async function fetchTeams(
  apiKey: string,
  fetchImpl: MinimalFetch,
): Promise<{ ok: true; teams: Array<{ key: string; name: string }> } | { ok: false; error: string }> {
  const teams: Array<{ key: string; name: string }> = []
  let after: string | null = null
  for (let page = 0; page < MAX_TEAM_PAGES; page += 1) {
    const result = await postGraphQL<RawTeamsPage>(apiKey, TEAMS_QUERY, { after }, fetchImpl)
    if (!result.ok) return result
    const nodes = result.data.teams?.nodes
    if (!Array.isArray(nodes)) return { ok: false, error: 'malformed response: missing teams.nodes' }
    for (const node of nodes) {
      const t = node as { key?: unknown; name?: unknown } | null
      // One row per team is the contract; a team node without a key or name would
      // vanish from the board and read as "nothing open". Fail the whole read.
      if (typeof t?.key !== 'string' || typeof t?.name !== 'string') {
        return { ok: false, error: 'malformed response: a team node lacks key or name' }
      }
      teams.push({ key: t.key, name: t.name })
    }
    const info = readPageInfo(result.data.teams?.pageInfo)
    if (!info.ok) return { ok: false, error: `teams: ${info.error}` }
    if (info.next === null) return { ok: true, teams }
    after = info.next
  }
  return { ok: false, error: `more than ${MAX_TEAM_PAGES * TEAMS_PAGE_SIZE} Linear teams: the board would be incomplete` }
}

/**
 * One row per Linear team. Absent key → not_configured (never a fabricated
 * empty board); any team failing → the whole read fails, because a board
 * missing a row reads as "that team has nothing open".
 */
export async function fetchTeamStages(deps: ProjectStagesDeps = {}): Promise<TeamStagesResult> {
  const apiKey = resolveApiKey(deps)
  if (!apiKey) return { ok: 'not_configured' }
  const fetchImpl = deps.fetchImpl ?? (fetch as unknown as MinimalFetch)
  const now = deps.now ?? (() => new Date())

  const teams = await fetchTeams(apiKey, fetchImpl)
  if (!teams.ok) return teams

  const rows: TeamStage[] = []
  for (const t of teams.teams) {
    const fetched = await fetchTeamOpenIssues(apiKey, t.key, fetchImpl)
    if (!fetched.ok) return fetched
    rows.push(summariseTeam(t.key, t.name, fetched.issues, fetched.capped))
  }
  rows.sort((a, b) => a.name.localeCompare(b.name))
  return { ok: true, checkedAt: now().toISOString(), teams: rows }
}
