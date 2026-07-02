// src/lib/nexus/branch-orchestrator.ts
// Branch-creation orchestrator for routed work items (UNI-2203, parent UNI-2183).
// Given a ticket id (e.g. RA-123, SYNTH-45, UNI-2203) and a title, creates a
// feature branch off main in the correct portfolio repo and returns its URL.
//
// Repo selection keys off the ticket-id prefix:
//   RA    → CleanExpo/RestoreAssist
//   SYNTH → CleanExpo/Synthex
//   UNI   → CleanExpo/Unite-Group (Nexus itself)
//
// GitHub auth: GITHUB_TOKEN from env at runtime (same convention as github-prs.ts).

const GITHUB_API = 'https://api.github.com'
const GITHUB_ORG = 'CleanExpo'

/** Ticket-id prefix → repository name within the CleanExpo org. */
const PREFIX_REPO_MAP: Record<string, string> = {
  RA: 'RestoreAssist',
  SYNTH: 'Synthex',
  UNI: 'Unite-Group',
}

export interface CreateWorkBranchResult {
  /** Branch name created, e.g. feature/uni-2203-branch-creation-orchestrator. */
  branch: string
  /** owner/repo the branch was created in, e.g. CleanExpo/Unite-Group. */
  repo: string
  /** Web URL to the created branch. */
  url: string
}

function ghHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN?.trim() ?? ''
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

/**
 * Resolve a ticket-id to its target repository name.
 * The prefix is the segment before the first hyphen (case-insensitive).
 * Throws with an actionable message on an unknown prefix.
 */
export function repoForTicket(ticketId: string): string {
  const prefix = ticketId.trim().split('-')[0]?.toUpperCase() ?? ''
  const repo = PREFIX_REPO_MAP[prefix]
  if (!repo) {
    throw new Error(
      `Unknown ticket prefix "${prefix}" in "${ticketId}". ` +
        `Expected one of: ${Object.keys(PREFIX_REPO_MAP).join(', ')}.`,
    )
  }
  return repo
}

/**
 * Build a branch name of the form feature/{ticket-id}-{slug}.
 * The ticket-id and title are lower-cased and non-alphanumeric runs collapse to
 * a single hyphen; leading/trailing hyphens are trimmed.
 */
export function branchNameFor(ticketId: string, title: string): string {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const ticketSlug = slugify(ticketId)
  const titleSlug = slugify(title)
  return titleSlug ? `feature/${ticketSlug}-${titleSlug}` : `feature/${ticketSlug}`
}

/** True when a usable GITHUB_TOKEN is present. */
export function isGitHubConfigured(): boolean {
  return (process.env.GITHUB_TOKEN?.trim() ?? '').length > 10
}

interface RawRef {
  object?: { sha?: string }
}

/**
 * Create a feature branch (feature/{ticket-id}-{slug}) off main in the repo that
 * matches the ticket-id prefix, confirm it via the GitHub API, and return its URL.
 *
 * @param repoId  The ticket id — its prefix selects the repo (RA|SYNTH|UNI-…).
 * @param title   Work item title — becomes the branch slug.
 * @throws Error with an actionable message on repo-access or branch-creation failure.
 */
export async function createWorkBranch(
  repoId: string,
  title: string,
): Promise<CreateWorkBranchResult> {
  if (!isGitHubConfigured()) {
    throw new Error(
      'GitHub is not configured — set GITHUB_TOKEN to create branches.',
    )
  }

  const repoName = repoForTicket(repoId)
  const owner = GITHUB_ORG
  const branch = branchNameFor(repoId, title)
  const repoSlug = `${owner}/${repoName}`

  // 1. Resolve main's HEAD sha (also proves repo access).
  const baseRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repoName}/git/ref/heads/main`,
    { headers: ghHeaders() },
  )
  if (!baseRes.ok) {
    if (baseRes.status === 404 || baseRes.status === 403 || baseRes.status === 401) {
      throw new Error(
        `Cannot access ${repoSlug} (HTTP ${baseRes.status}). ` +
          `Check the repo exists and GITHUB_TOKEN has access to it.`,
      )
    }
    throw new Error(`Failed to read main of ${repoSlug}: HTTP ${baseRes.status}.`)
  }
  const baseRef = (await baseRes.json()) as RawRef
  const sha = baseRef.object?.sha
  if (!sha) {
    throw new Error(`Could not resolve main HEAD sha for ${repoSlug}.`)
  }

  // 2. Create the branch ref from main's sha.
  const createRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repoName}/git/refs`,
    {
      method: 'POST',
      headers: ghHeaders(),
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    },
  )
  if (!createRes.ok) {
    if (createRes.status === 422) {
      throw new Error(
        `Branch "${branch}" already exists in ${repoSlug} — choose a different title or ticket id.`,
      )
    }
    throw new Error(
      `Failed to create branch "${branch}" in ${repoSlug}: HTTP ${createRes.status}.`,
    )
  }

  // 3. Confirm the branch exists via the GitHub API before returning its URL.
  const confirmRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repoName}/git/ref/heads/${branch}`,
    { headers: ghHeaders() },
  )
  if (!confirmRes.ok) {
    throw new Error(
      `Branch "${branch}" was created in ${repoSlug} but could not be confirmed (HTTP ${confirmRes.status}).`,
    )
  }

  return {
    branch,
    repo: repoSlug,
    url: `https://github.com/${owner}/${repoName}/tree/${branch}`,
  }
}
