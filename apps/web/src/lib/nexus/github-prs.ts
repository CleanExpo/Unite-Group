// src/lib/nexus/github-prs.ts
// GitHub PR integration for the Nexus human approval gate.
// Fetches PRs tagged nexus-pending-approval across all configured repos.
// Repos are set via NEXUS_REPOS env var (comma-separated owner/repo pairs).

const GITHUB_API = 'https://api.github.com'
export const NEXUS_LABEL = 'nexus-pending-approval'

export interface NexusPRFile {
  filename: string
  additions: number
  deletions: number
  patch?: string
}

export interface NexusPR {
  owner: string
  repo: string
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  user: string
  files: NexusPRFile[]
  fileCount: number
  aiSummary: string
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

export function isNexusGitHubConfigured(): boolean {
  const token = process.env.GITHUB_TOKEN?.trim() ?? ''
  return token.length > 10
}

export function getNexusRepos(): Array<{ owner: string; repo: string }> {
  const raw = process.env.NEXUS_REPOS?.trim() ?? ''
  if (raw) {
    return raw.split(',').flatMap(r => {
      const parts = r.trim().split('/')
      if (parts.length === 2 && parts[0] && parts[1]) {
        return [{ owner: parts[0], repo: parts[1] }]
      }
      return []
    })
  }
  const owner = process.env.GITHUB_OWNER?.trim() ?? ''
  if (owner) {
    return [{ owner, repo: 'Unite-Group' }]
  }
  return []
}

interface RawGitHubSearchItem {
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  user: { login: string }
  pull_request?: { url: string; merged_at: string | null }
  repository_url: string
}

interface RawPRFile {
  filename: string
  additions: number
  deletions: number
  patch?: string
}

async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<NexusPRFile[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=30`,
      { headers: ghHeaders() },
    )
    if (!res.ok) {
      console.warn(`[Nexus] fetchPRFiles ${owner}/${repo}#${prNumber}: ${res.status}`)
      return []
    }
    const files = (await res.json()) as RawPRFile[]
    return files.map(f => ({
      filename: f.filename,
      additions: f.additions,
      deletions: f.deletions,
      // Truncate patch to avoid huge payloads in the API response
      patch: f.patch ? f.patch.slice(0, 2000) : undefined,
    }))
  } catch (err) {
    console.warn('[Nexus] fetchPRFiles error:', err)
    return []
  }
}

async function fetchViaSearch(
  repos: Array<{ owner: string; repo: string }>,
): Promise<RawGitHubSearchItem[]> {
  const repoFilters = repos.map(r => `repo:${r.owner}/${r.repo}`).join(' ')
  const q = `is:pr is:open label:${NEXUS_LABEL} ${repoFilters}`
  const url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(q)}&per_page=30`

  const res = await fetch(url, { headers: ghHeaders() })
  if (!res.ok) {
    console.warn(`[Nexus] search/issues failed: ${res.status}`)
    return []
  }
  const data = (await res.json()) as { items: RawGitHubSearchItem[] }
  return data.items ?? []
}

async function fetchViaPerRepo(
  repos: Array<{ owner: string; repo: string }>,
): Promise<RawGitHubSearchItem[]> {
  const all: RawGitHubSearchItem[] = []
  for (const { owner, repo } of repos) {
    try {
      const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&labels=${NEXUS_LABEL}&per_page=30`,
        { headers: ghHeaders() },
      )
      if (!res.ok) continue
      const data = (await res.json()) as RawGitHubSearchItem[]
      all.push(...data.filter(i => !!i.pull_request))
    } catch {
      // continue with next repo
    }
  }
  return all
}

export async function fetchNexusPendingPRs(): Promise<NexusPR[]> {
  const repos = getNexusRepos()
  if (!repos.length || !isNexusGitHubConfigured()) return []

  let issues: RawGitHubSearchItem[]
  try {
    issues = await fetchViaSearch(repos)
  } catch {
    issues = await fetchViaPerRepo(repos)
  }

  if (!issues.length) return []

  const results: NexusPR[] = []
  for (const issue of issues) {
    if (!issue.pull_request) continue

    const match = issue.repository_url.match(/repos\/([^/]+)\/([^/]+)$/)
    if (!match) continue
    const owner = match[1]
    const repo = match[2]

    const allFiles = await fetchPRFiles(owner, repo, issue.number)

    results.push({
      owner,
      repo,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      html_url: issue.html_url,
      created_at: issue.created_at,
      user: issue.user.login,
      files: allFiles.slice(0, 3),
      fileCount: allFiles.length,
      aiSummary: '',
    })
  }

  return results
}

export async function mergePR(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    {
      method: 'PUT',
      headers: ghHeaders(),
      body: JSON.stringify({ merge_method: 'squash' }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub merge failed: ${res.status} — ${JSON.stringify(err)}`)
  }
}

export async function closePR(
  owner: string,
  repo: string,
  prNumber: number,
  reason: string,
): Promise<void> {
  // Log rejection reason as a PR comment (best-effort)
  await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: ghHeaders(),
      body: JSON.stringify({ body: `**Rejected by founder:** ${reason}` }),
    },
  ).catch(() => {
    // Non-fatal — PR will still be closed
  })

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      method: 'PATCH',
      headers: ghHeaders(),
      body: JSON.stringify({ state: 'closed' }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub close PR failed: ${res.status} — ${JSON.stringify(err)}`)
  }
}
