// src/lib/command-centre/founder-workboard.ts
//
// UNI-2340 slices 4+5 — Linear-backed fetchers for the two remaining dead
// command-centre tiles (Action Queue, Blocked Lanes). Both used to read
// stale local markdown fossils from a retired supervisor
// (SENIOR_PM_NEXT_ACTION_QUEUE.md / ACTIVE_PROGRAMME_BACKLOG.md) that are
// permanently empty on Vercel. That workflow state genuinely lives in
// Linear today, so these tiles re-source from it directly — same
// plain-fetch, honest-state discipline as portfolio-health-fetchers.ts.
// LINEAR_API_KEY is only ever attached to the outbound request header —
// never returned to the caller or embedded in a value.

const LINEAR_GQL = 'https://api.linear.app/graphql'
const UPSTREAM_TIMEOUT_MS = 8000

/** Minimal fetch surface — only what we call on the response. Lets tests
 *  inject a lightweight mock instead of constructing a real Response. */
export type MinimalFetch = (
  input: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface FounderWorkboardDeps {
  /** Defaults to process.env.LINEAR_API_KEY?.trim(). Inject for tests. */
  apiKey?: string
  /** Defaults to the global fetch. Inject for tests. */
  fetchImpl?: MinimalFetch
}

export interface FounderQueueIssue {
  id: string
  identifier: string
  title: string
  priority: number
  url: string
  updatedAt: string
  stateName: string
}

export interface FounderBlockedIssue {
  id: string
  identifier: string
  title: string
  priority: number
  url: string
  updatedAt: string
  stateName: string
  labelNames: string[]
}

export type ActionQueueFetchResult =
  | { ok: true; issues: FounderQueueIssue[] }
  | { ok: false; error: string }
  | { ok: 'not_configured' }

export type BlockedLanesFetchResult =
  | { ok: true; issues: FounderBlockedIssue[] }
  | { ok: false; error: string }
  | { ok: 'not_configured' }

function resolveApiKey(deps: FounderWorkboardDeps): string | undefined {
  if (Object.prototype.hasOwnProperty.call(deps, 'apiKey')) {
    return deps.apiKey?.trim()
  }
  return process.env.LINEAR_API_KEY?.trim()
}

async function postGraphQL<T>(
  apiKey: string,
  query: string,
  fetchImpl: MinimalFetch,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(LINEAR_GQL, {
      method: 'POST',
      headers: { authorization: apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
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

// ─── Raw GraphQL node shape (untrusted — validated field-by-field) ─────────

interface RawIssueNode {
  id?: unknown
  identifier?: unknown
  title?: unknown
  priority?: unknown
  url?: unknown
  updatedAt?: unknown
  state?: { name?: unknown } | null
  labels?: { nodes?: Array<{ name?: unknown } | null> } | null
}

function isValidCore(node: unknown): node is RawIssueNode & {
  id: string
  identifier: string
  title: string
  priority: number
  updatedAt: string
} {
  if (typeof node !== 'object' || node === null) return false
  const n = node as RawIssueNode
  return (
    typeof n.id === 'string' &&
    typeof n.identifier === 'string' &&
    typeof n.title === 'string' &&
    typeof n.priority === 'number' &&
    typeof n.updatedAt === 'string'
  )
}

function toQueueIssue(node: unknown): FounderQueueIssue | null {
  if (!isValidCore(node)) return null
  return {
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    priority: node.priority,
    url: typeof node.url === 'string' ? node.url : '',
    updatedAt: node.updatedAt,
    stateName: typeof node.state?.name === 'string' ? node.state.name : '',
  }
}

function toBlockedIssue(node: unknown): FounderBlockedIssue | null {
  if (!isValidCore(node)) return null
  const labelNodes = Array.isArray(node.labels?.nodes) ? node.labels.nodes : []
  const labelNames = labelNodes
    .map((l) => (l && typeof l.name === 'string' ? l.name : null))
    .filter((n): n is string => n !== null)
  return {
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    priority: node.priority,
    url: typeof node.url === 'string' ? node.url : '',
    updatedAt: node.updatedAt,
    stateName: typeof node.state?.name === 'string' ? node.state.name : '',
    labelNames,
  }
}

// ─── Action Queue — top 5 open issues assigned to the founder ──────────────

const ACTION_QUEUE_QUERY = `query FounderActionQueue {
  viewer {
    assignedIssues(
      first: 250
      filter: { completedAt: { null: true }, canceledAt: { null: true } }
      orderBy: updatedAt
    ) {
      nodes {
        id
        identifier
        title
        priority
        url
        updatedAt
        state { id name type }
      }
    }
  }
}`

/**
 * Rank used to order the action queue: Urgent(1) then High(2) then
 * Normal(3)/Low(4) — None(0), "no priority set", sorts last. Ties break by
 * most-recently-updated first.
 */
function priorityRank(priority: number): number {
  return priority === 0 ? 5 : priority
}

export function sortActionQueueIssues(issues: FounderQueueIssue[]): FounderQueueIssue[] {
  return [...issues].sort((a, b) => {
    const rankDiff = priorityRank(a.priority) - priorityRank(b.priority)
    if (rankDiff !== 0) return rankDiff
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

/**
 * Top 5 open issues assigned to the founder (the Linear personal API key's
 * owner — single-tenant, so "viewer" is always the founder), ordered
 * Urgent → High → Normal/Low → None, then most-recently-updated. Absent key
 * → an explicit not_configured signal (never a fabricated empty queue).
 */
export async function fetchActionQueue(deps: FounderWorkboardDeps = {}): Promise<ActionQueueFetchResult> {
  const apiKey = resolveApiKey(deps)
  if (!apiKey) return { ok: 'not_configured' }
  const fetchImpl = deps.fetchImpl ?? (fetch as unknown as MinimalFetch)
  const result = await postGraphQL<{ viewer?: { assignedIssues?: { nodes?: unknown[] } } }>(
    apiKey,
    ACTION_QUEUE_QUERY,
    fetchImpl,
  )
  if (!result.ok) return result
  const nodes = result.data.viewer?.assignedIssues?.nodes
  if (!Array.isArray(nodes)) return { ok: false, error: 'malformed response: missing viewer.assignedIssues.nodes' }
  const issues = nodes.map(toQueueIssue).filter((i): i is FounderQueueIssue => i !== null)
  return { ok: true, issues: sortActionQueueIssues(issues).slice(0, 5) }
}

// ─── Blocked Lanes — open issues in a blocked state or carrying a blocked label ─

const BLOCKED_LANES_QUERY = `query FounderBlockedLanes {
  issues(
    first: 100
    filter: {
      completedAt: { null: true }
      canceledAt: { null: true }
      or: [
        { state: { name: { containsIgnoreCase: "block" } } }
        { labels: { name: { containsIgnoreCase: "blocked" } } }
      ]
    }
    orderBy: updatedAt
  ) {
    nodes {
      id
      identifier
      title
      priority
      url
      updatedAt
      state { id name type }
      labels { nodes { name } }
    }
  }
}`

/**
 * Open issues whose workflow state name matches /block/i (Linear's state
 * *types* are triage/backlog/unstarted/started/completed/canceled —
 * "blocked" is a named state within one of those, usually `started`) plus
 * open issues carrying a label matching /blocked/i. Single OR'd query;
 * deduped by issue id defensively in case an issue matches both arms.
 */
export async function fetchBlockedLanes(deps: FounderWorkboardDeps = {}): Promise<BlockedLanesFetchResult> {
  const apiKey = resolveApiKey(deps)
  if (!apiKey) return { ok: 'not_configured' }
  const fetchImpl = deps.fetchImpl ?? (fetch as unknown as MinimalFetch)
  const result = await postGraphQL<{ issues?: { nodes?: unknown[] } }>(
    apiKey,
    BLOCKED_LANES_QUERY,
    fetchImpl,
  )
  if (!result.ok) return result
  const nodes = result.data.issues?.nodes
  if (!Array.isArray(nodes)) return { ok: false, error: 'malformed response: missing issues.nodes' }

  const seen = new Set<string>()
  const issues: FounderBlockedIssue[] = []
  for (const node of nodes) {
    const issue = toBlockedIssue(node)
    if (!issue || seen.has(issue.id)) continue
    seen.add(issue.id)
    issues.push(issue)
  }
  return { ok: true, issues }
}

// ─── Mapping helpers — pure, shaped to the tiles' existing result contracts ─

export interface ActionQueueRowsResult {
  headers: string[]
  rows: string[][]
}

function priorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'Urgent'
    case 2:
      return 'High'
    case 3:
      return 'Normal'
    case 4:
      return 'Low'
    default:
      return 'None'
  }
}

/**
 * Maps fetched issues onto ActionQueueTile's existing headers/rows contract.
 * Headers keep the '#' / 'Action' substrings the tile's findColumnIndex
 * lookup already matches, so the presentational component needs no change.
 */
export function mapActionQueueToRows(issues: FounderQueueIssue[]): ActionQueueRowsResult {
  return {
    headers: ['#', 'Action', 'Priority', 'Updated'],
    rows: issues.map((i) => [i.identifier, i.title, priorityLabel(i.priority), i.updatedAt]),
  }
}

export interface BlockedLaneRowShape {
  number: number | null
  name: string
  status: string
  next_action: string
  required_authority: string
  autonomous: string
}

/** Maps fetched issues onto BlockedLanesTile's existing BlockedLaneRow contract. */
export function mapBlockedIssuesToRows(issues: FounderBlockedIssue[]): BlockedLaneRowShape[] {
  return issues.map((i) => {
    const numMatch = /-(\d+)$/.exec(i.identifier)
    const byState = /block/i.test(i.stateName)
    const byLabel = i.labelNames.some((l) => /blocked/i.test(l))
    const required_authority =
      byState && byLabel
        ? `state: ${i.stateName} + label: blocked`
        : byState
          ? `state: ${i.stateName}`
          : 'label: blocked'
    return {
      number: numMatch ? Number.parseInt(numMatch[1], 10) : null,
      name: i.title,
      status: i.stateName,
      next_action: '',
      required_authority,
      autonomous: 'blocked',
    }
  })
}
