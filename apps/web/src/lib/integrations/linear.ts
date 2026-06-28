// src/lib/integrations/linear.ts
// Linear GraphQL client — personal API key auth (no Bearer prefix)

const LINEAR_API = 'https://api.linear.app/graphql'
const API_KEY = process.env.LINEAR_API_KEY ?? ''

function isLinearConfigured(): boolean {
  return API_KEY.length > 0
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: API_KEY,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Linear API error: ${res.status}`)
  const json = await res.json() as { data: T; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LinearState {
  id: string
  name: string
  type: 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
}

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  priority: number      // 0=none 1=urgent 2=high 3=normal 4=low
  team: { id: string; key: string; name: string }
  // Linear project the issue is filed under. Several businesses share one team
  // (UNI covers ccw + ato + itr; DR covers dr + nrpg), so the project is what
  // tells them apart on the Kanban board. Null when the issue has no project.
  project?: { id: string; name: string } | null
  state: LinearState
}

export interface LinearTeamStates {
  id: string
  key: string
  states: { nodes: LinearState[] }
}

export interface LinearIssueLabel {
  id: string
  name: string
}

// ─── Column mapping ───────────────────────────────────────────────────────────

// Kanban column → Linear state name (used when updating issue on drag)
export const COLUMN_TO_STATE_NAME: Record<string, string> = {
  today:    'In Progress',
  hot:      'In Review',
  pipeline: 'Todo',
  someday:  'Backlog',
  done:     'Done',
}

// Linear state → Kanban column
export function stateToColumn(state: LinearState): string {
  if (state.type === 'completed') return 'done'
  if (state.type === 'canceled') return 'done'
  if (state.type === 'backlog') return 'someday'
  if (state.type === 'unstarted') return 'pipeline'
  // started — distinguish by name
  if (state.name === 'In Review') return 'hot'
  return 'today'
}

// Linear team key → primary business key (for display on Kanban cards)
const TEAM_TO_BUSINESS: Record<string, string> = {
  SYN: 'synthex',
  DR:  'dr',       // DR-NRPG team covers dr, nrpg
  GP:  'carsi',    // G-Pilot
  RA:  'restore',
  UNI: 'ccw',      // Unite-Group covers ccw + ato
}

// Business key → Linear team key (for issue creation)
export const BUSINESS_TO_TEAM: Record<string, string> = {
  synthex:  'SYN',
  dr:       'DR',
  nrpg:     'DR',
  carsi:    'GP',
  restore:  'RA',
  ccw:      'UNI',
  ato:      'UNI',
  itr:      'UNI',
}

// Actual Linear project names per business key, for businesses that SHARE a
// Linear team and so can't be told apart by team alone (UNI → ccw/ato/itr;
// DR → dr/nrpg). Names verified against the live Linear workspace 22/06/2026.
// Businesses with their own team (synthex/SYN, carsi/GP, restore/RA) need no
// entry — the team mapping already identifies them.
// NOTE: these are LINEAR project names, distinct from the repo-style names the
// CommandCentre registry uses in business-focus.ts. Keep the two in sync by
// intent, not by sharing — they reference different systems.
const LINEAR_PROJECTS_BY_BUSINESS: Record<string, string[]> = {
  itr:  ['Dimitri ITR Platform'],
  ato:  ['ATO'],
  ccw:  ['CCW CRM'],
  dr:   ['Disaster Recovery Website'],
  nrpg: ['DR-NRPG Ops', 'DR-NRPG Contractor Onboarding'],
}

const normalizeProject = (name: string): string => name.trim().toLowerCase()

// Inverse of LINEAR_PROJECTS_BY_BUSINESS: normalised project name → business key.
const PROJECT_TO_BUSINESS: Record<string, string> = Object.entries(
  LINEAR_PROJECTS_BY_BUSINESS,
).reduce<Record<string, string>>((acc, [businessKey, projectNames]) => {
  for (const projectName of projectNames) acc[normalizeProject(projectName)] = businessKey
  return acc
}, {})

export function teamKeyToBusiness(teamKey: string): string {
  return TEAM_TO_BUSINESS[teamKey] ?? 'ccw'
}

/**
 * Resolve a Linear issue to its business key for the Kanban board. Prefers the
 * issue's project (the only thing that distinguishes businesses sharing a team —
 * e.g. itr/ato/ccw on UNI), falling back to the team-level mapping when the
 * issue has no project or an unrecognised one.
 */
export function issueToBusiness(
  issue: { team: { key: string }; project?: { name: string } | null },
): string {
  const projectName = issue.project?.name
  if (projectName) {
    const byProject = PROJECT_TO_BUSINESS[normalizeProject(projectName)]
    if (byProject) return byProject
  }
  return teamKeyToBusiness(issue.team.key)
}

/**
 * Canonical Linear project name to file a new issue under for a business, so it
 * round-trips to the correct Kanban card. Returns undefined when the business
 * has no project mapping.
 */
export function projectNameForBusiness(businessKey: string): string | undefined {
  return LINEAR_PROJECTS_BY_BUSINESS[businessKey]?.[0]
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchIssues(): Promise<LinearIssue[]> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — returning empty issues')
    return []
  }

  const allIssues: LinearIssue[] = []
  let cursor: string | null = null
  const MAX_PAGES = 5 // Cap at 500 issues (5 × 100)

  interface IssuesResponse {
    issues: {
      nodes: LinearIssue[]
      pageInfo: { hasNextPage: boolean; endCursor: string }
    }
  }

  for (let page = 0; page < MAX_PAGES; page++) {
    const afterClause: string = cursor ? `after: "${cursor}"` : ''
    const data: IssuesResponse = await gql<IssuesResponse>(`{
      issues(
        first: 100
        ${afterClause}
        filter: { state: { type: { nin: ["canceled"] } } }
        orderBy: updatedAt
      ) {
        nodes {
          id
          identifier
          title
          priority
          team { id key name }
          project { id name }
          state { id name type }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`)

    allIssues.push(...data.issues.nodes)

    if (!data.issues.pageInfo.hasNextPage) break
    cursor = data.issues.pageInfo.endCursor
  }

  return allIssues
}

/**
 * Issues carrying a given label. Used by the Hermes Kanban serverless fallback to
 * show Hermes-created tasks (the `hermes` CLI doesn't exist in Vercel runtime).
 */
export async function fetchIssuesByLabel(labelName: string): Promise<Array<LinearIssue & { url: string }>> {
  if (!isLinearConfigured()) return []
  const safe = labelName.replace(/"/g, '')
  const data = await gql<{ issues: { nodes: Array<LinearIssue & { url: string }> } }>(`{
    issues(
      first: 50
      filter: { labels: { name: { eq: "${safe}" } }, state: { type: { nin: ["canceled"] } } }
      orderBy: updatedAt
    ) {
      nodes { id identifier title url priority team { id key name } state { id name type } }
    }
  }`)
  return data.issues.nodes
}

/**
 * Issues for a given team in a given workflow state, filtered server-side. Avoids
 * fetching up to 500 issues and filtering in memory (used by the Synthex monitor).
 */
export async function fetchIssuesByTeamAndState(
  teamKey: string,
  stateName: string,
): Promise<LinearIssue[]> {
  if (!isLinearConfigured()) return []
  const safeTeam = teamKey.replace(/"/g, '')
  const safeState = stateName.replace(/"/g, '')
  const data = await gql<{ issues: { nodes: LinearIssue[] } }>(`{
    issues(
      first: 100
      filter: { team: { key: { eq: "${safeTeam}" } }, state: { name: { eq: "${safeState}" } } }
      orderBy: updatedAt
    ) {
      nodes { id identifier title priority team { id key name } project { id name } state { id name type } }
    }
  }`)
  return data.issues.nodes
}

// ─── Single issue detail ──────────────────────────────────────────────────────

export interface LinearIssueDetail extends LinearIssue {
  description: string | null
  url: string
  createdAt: string
  updatedAt: string
  labels: { nodes: { id: string; name: string; color: string }[] }
}

export async function fetchIssue(id: string): Promise<LinearIssueDetail> {
  if (!isLinearConfigured()) {
    throw new Error('LINEAR_API_KEY is not configured — cannot fetch issue')
  }
  const data = await gql<{ issue: LinearIssueDetail }>(`
    query GetIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        priority
        url
        createdAt
        updatedAt
        team { id key name }
        project { id name }
        state { id name type }
        labels { nodes { id name color } }
      }
    }
  `, { id })
  return data.issue
}

export async function fetchTeamStates(): Promise<LinearTeamStates[]> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — returning empty team states')
    return []
  }
  const data = await gql<{ teams: { nodes: LinearTeamStates[] } }>(`{
    teams {
      nodes {
        id
        key
        states { nodes { id name type } }
      }
    }
  }`)
  return data.teams.nodes
}

export async function updateIssueState(issueId: string, stateId: string): Promise<void> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — skipping issue state update')
    return
  }
  await gql(`
    mutation UpdateIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
      }
    }
  `, { id: issueId, stateId })
}

// ─── Issue creation ───────────────────────────────────────────────────────────

export interface CreateIssueInput {
  title: string
  description?: string
  teamKey: string       // e.g. 'SYN', 'DR', 'GP'
  priority?: number     // 0=no priority, 1=urgent, 2=high, 3=medium, 4=low
  labelNames?: string[] // Linear label names to apply at creation time
  projectName?: string  // Linear project to file the issue under (e.g. 'Unite-Group')
}

/**
 * Resolve a Linear project name to its ID (server-side filter). Returns null if
 * not found. The autonomous claim loop scopes candidates to a project, so issues
 * created for the autopilot must set it or they're never claimed.
 */
export async function resolveProjectId(projectName: string): Promise<string | null> {
  if (!isLinearConfigured()) return null
  const data = await gql<{ projects: { nodes: { id: string; name: string }[] } }>(
    `query ProjectByName($name: String!) {
      projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } }
    }`,
    { name: projectName },
  )
  return data.projects.nodes[0]?.id ?? null
}

export async function resolveTeamId(teamKey: string): Promise<string> {
  if (!isLinearConfigured()) {
    throw new Error('LINEAR_API_KEY is not configured — cannot resolve team ID')
  }
  const teams = await fetchTeamStates()
  const team = teams.find(t => t.key === teamKey)
  if (!team) throw new Error(`Linear team not found: ${teamKey}`)
  return team.id
}

export async function fetchIssueLabels(): Promise<LinearIssueLabel[]> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — returning empty issue labels')
    return []
  }

  const labels: LinearIssueLabel[] = []
  let cursor: string | null = null
  const MAX_PAGES = 4 // Cap at 1,000 labels

  interface LabelsResponse {
    issueLabels: {
      nodes: LinearIssueLabel[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }

  for (let page = 0; page < MAX_PAGES; page++) {
    const afterClause: string = cursor ? `, after: "${cursor}"` : ''
    const data: LabelsResponse = await gql<LabelsResponse>(`{
      issueLabels(first: 250${afterClause}) {
        nodes { id name }
        pageInfo { hasNextPage endCursor }
      }
    }`)

    labels.push(...data.issueLabels.nodes)

    if (!data.issueLabels.pageInfo.hasNextPage) break
    cursor = data.issueLabels.pageInfo.endCursor
  }

  return labels
}

/**
 * Look up labels by exact name via a SERVER-SIDE filter.
 *
 * The workspace is a shared mega-workspace with thousands of labels, so fetching
 * them all and filtering client-side (fetchIssueLabels caps at 1000) silently
 * drops labels — resolution then fails with "label not found" even though the
 * label exists (this broke the Kanban [Apply] task-generator). Filtering by name
 * on the server is O(requested) and has no cap.
 */
async function fetchLabelsByName(names: string[]): Promise<LinearIssueLabel[]> {
  if (names.length === 0) return []
  const data = await gql<{ issueLabels: { nodes: LinearIssueLabel[] } }>(
    `query LabelsByName($names: [String!]) {
      issueLabels(filter: { name: { in: $names } }, first: 250) {
        nodes { id name }
      }
    }`,
    { names },
  )
  return data.issueLabels.nodes
}

export async function resolveLabelIds(labelNames: string[] = []): Promise<string[]> {
  const wantedLabels = Array.from(new Set(labelNames.map(label => label.trim()).filter(Boolean)))
  if (wantedLabels.length === 0) return []

  const labels = await fetchLabelsByName(wantedLabels)
  const labelsByName = new Map(labels.map(label => [label.name.toLowerCase(), label.id]))
  const missingLabels: string[] = []
  const labelIds: string[] = []

  for (const name of wantedLabels) {
    const labelId = labelsByName.get(name.toLowerCase())
    if (!labelId) missingLabels.push(name)
    else labelIds.push(labelId)
  }

  if (missingLabels.length > 0) {
    throw new Error(`Linear label not found: ${missingLabels.join(', ')}`)
  }

  return labelIds
}

async function createIssueLabel(name: string): Promise<string> {
  const data = await gql<{ issueLabelCreate: { issueLabel: { id: string } } }>(`
    mutation CreateLabel($name: String!) {
      issueLabelCreate(input: { name: $name }) { issueLabel { id } }
    }
  `, { name })
  return data.issueLabelCreate.issueLabel.id
}

/**
 * Like resolveLabelIds, but creates any label that doesn't exist yet (instead of
 * throwing). Used so a Hermes task always gets its autopilot labels even on a
 * fresh workspace.
 */
export async function resolveOrCreateLabelIds(labelNames: string[] = []): Promise<string[]> {
  const wanted = Array.from(new Set(labelNames.map((l) => l.trim()).filter(Boolean)))
  if (wanted.length === 0) return []
  const existing = await fetchLabelsByName(wanted)
  const byName = new Map(existing.map((l) => [l.name.toLowerCase(), l.id]))
  const ids: string[] = []
  for (const name of wanted) {
    ids.push(byName.get(name.toLowerCase()) ?? (await createIssueLabel(name)))
  }
  return ids
}

export async function createIssue(input: CreateIssueInput): Promise<{ id: string; url?: string }> {
  if (!isLinearConfigured()) {
    throw new Error('LINEAR_API_KEY is not configured — cannot create issue')
  }
  const teamId = await resolveTeamId(input.teamKey)
  const labelIds = await resolveLabelIds(input.labelNames)
  const projectId = input.projectName ? await resolveProjectId(input.projectName) : null

  const data = await gql<{ issueCreate: { issue: { id: string; identifier: string; url: string } } }>(`
    mutation CreateIssue(
      $teamId: String!
      $title: String!
      $description: String
      $priority: Int
      $labelIds: [String!]
      $projectId: String
    ) {
      issueCreate(input: {
        teamId: $teamId
        title: $title
        description: $description
        priority: $priority
        labelIds: $labelIds
        projectId: $projectId
      }) {
        issue { id identifier url }
      }
    }
  `, {
    teamId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    labelIds,
    projectId,
  })

  return { id: data.issueCreate.issue.identifier, url: data.issueCreate.issue.url }
}

export async function fetchIssueCountByBusiness(): Promise<Record<string, number>> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — returning empty issue counts')
    return {}
  }
  const issues = await fetchIssues()
  const counts: Record<string, number> = {}
  for (const issue of issues) {
    const bizKey = issueToBusiness(issue)
    counts[bizKey] = (counts[bizKey] ?? 0) + 1
  }
  return counts
}

// ─── Autonomous claim-loop support (UNI-2143) ──────────────────────────────────

// Resolve a workflow state id by name within a team (e.g. 'In Progress' for 'UNI').
export async function resolveStateId(teamKey: string, stateName: string): Promise<string> {
  if (!isLinearConfigured()) {
    throw new Error('LINEAR_API_KEY is not configured — cannot resolve state ID')
  }
  const teams = await fetchTeamStates()
  const team = teams.find(t => t.key === teamKey)
  if (!team) throw new Error(`Linear team not found: ${teamKey}`)
  const state = team.states.nodes.find(s => s.name.toLowerCase() === stateName.toLowerCase())
  if (!state) throw new Error(`Linear state '${stateName}' not found in team ${teamKey}`)
  return state.id
}

// Post a comment (claim receipt, evidence) onto an issue.
export async function addComment(issueId: string, body: string): Promise<void> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — skipping comment')
    return
  }
  await gql(`
    mutation AddComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) { success }
    }
  `, { issueId, body })
}

export interface LinearClaimCandidateRaw {
  id: string
  identifier: string
  title: string
  priority: number
  description: string | null
  url: string
  createdAt: string
  state: LinearState
  labels: { nodes: { id: string; name: string }[] }
}

// Fetch claimable autonomous candidates: issues in the given team/project that
// are in an unstarted/backlog state and carry one of the autonomous labels.
// Includes description + labels so the claim filter can evaluate eligibility.
export async function fetchClaimCandidates(opts: {
  teamKey: string
  labelNames: string[]
  projectName?: string
}): Promise<LinearClaimCandidateRaw[]> {
  if (!isLinearConfigured()) {
    console.warn('LINEAR_API_KEY is not configured — returning empty claim candidates')
    return []
  }
  const projectFilter = opts.projectName
    ? `project: { name: { eq: ${JSON.stringify(opts.projectName)} } }`
    : ''
  const data = await gql<{ issues: { nodes: LinearClaimCandidateRaw[] } }>(`{
    issues(
      first: 100
      filter: {
        team: { key: { eq: ${JSON.stringify(opts.teamKey)} } }
        state: { type: { in: ["unstarted", "backlog"] } }
        labels: { name: { in: ${JSON.stringify(opts.labelNames)} } }
        ${projectFilter}
      }
      orderBy: createdAt
    ) {
      nodes {
        id
        identifier
        title
        priority
        description
        url
        createdAt
        state { id name type }
        labels { nodes { id name } }
      }
    }
  }`)
  return data.issues.nodes
}

// Timestamp of the most recently started (claimed) autonomous issue, or null.
// Used by the queue-health surface to detect a stalled loop.
export async function fetchMostRecentClaimAt(opts: {
  teamKey: string
  labelNames: string[]
  projectName?: string
}): Promise<string | null> {
  if (!isLinearConfigured()) return null
  const projectFilter = opts.projectName
    ? `project: { name: { eq: ${JSON.stringify(opts.projectName)} } }`
    : ''
  const data = await gql<{
    issues: { nodes: { startedAt: string | null; updatedAt: string }[] }
  }>(`{
    issues(
      first: 1
      filter: {
        team: { key: { eq: ${JSON.stringify(opts.teamKey)} } }
        state: { type: { eq: "started" } }
        labels: { name: { in: ${JSON.stringify(opts.labelNames)} } }
        ${projectFilter}
      }
      orderBy: updatedAt
    ) {
      nodes { startedAt updatedAt }
    }
  }`)
  const node = data.issues.nodes[0]
  if (!node) return null
  return node.startedAt ?? node.updatedAt
}
