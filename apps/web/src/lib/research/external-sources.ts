// src/lib/research/external-sources.ts
// External-source research capability (UNI-2135).
//
// Structured source search across GitHub repositories and Hugging Face
// models/datasets. Distinct from the LLM web-search research capability
// (`src/lib/ai/capabilities/research.ts` + `src/app/api/research/route.ts`):
// that asks Claude to search the open web; this performs typed API queries
// against developer source registries and returns an honestly-statused report.
//
// Design rules:
//  - The pure assembly is deterministic and injectable. The route supplies
//    process.env token values, a real `fetch`, and an ISO timestamp via deps.
//    Nothing here reads process.env or the wall clock.
//  - Secrets never leak. Tokens are only ever placed in the Authorization
//    header; they are never written to items, meta, or error strings. Error
//    messages are sanitised to a fixed, source-scoped string.
//  - Honest statuses only — no fabricated results. Missing GitHub token →
//    'not_configured'; any failure → 'error' with empty items.

const GITHUB_SEARCH_API = 'https://api.github.com/search/repositories'
const HF_MODELS_API = 'https://huggingface.co/api/models'
const HF_DATASETS_API = 'https://huggingface.co/api/datasets'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 25

export type ExternalSourceId = 'github' | 'huggingface'
export type SourceStatus = 'ok' | 'not_configured' | 'error'

export interface ExternalSourceItem {
  title: string
  url: string
  description: string
  meta?: Record<string, string | number>
}

export interface ExternalSourceResult {
  source: ExternalSourceId
  status: SourceStatus
  items: ExternalSourceItem[]
  error: string | null
}

export interface ExternalResearchReport {
  query: string
  generatedAt: string
  sources: ExternalSourceResult[]
}

/** Injected dependencies for a single source search. */
export interface ExternalSourceDeps {
  token?: string | null
  fetchImpl?: typeof fetch
  limit?: number
}

/** Injected dependencies for the full report assembly. */
export interface ExternalResearchDeps {
  githubToken?: string | null
  hfToken?: string | null
  fetchImpl?: typeof fetch
  generatedAt: string
  limit?: number
}

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIMIT
  }
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

// ── GitHub ───────────────────────────────────────────────────────────────────

interface GitHubRepoSearchResponse {
  items?: Array<{
    full_name?: string
    html_url?: string
    description?: string | null
    stargazers_count?: number
    language?: string | null
  }>
}

/**
 * Search GitHub repositories by relevance to `query`, sorted by stars.
 * Requires a token (`deps.token`); without one returns 'not_configured'.
 * Never includes the token in any returned field.
 */
export async function searchGitHubRepositories(
  query: string,
  deps: ExternalSourceDeps
): Promise<ExternalSourceResult> {
  const token = deps.token ?? ''
  if (!token) {
    return { source: 'github', status: 'not_configured', items: [], error: null }
  }

  const fetchImpl = deps.fetchImpl ?? fetch
  const limit = clampLimit(deps.limit)

  try {
    const url = `${GITHUB_SEARCH_API}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!res.ok) {
      return {
        source: 'github',
        status: 'error',
        items: [],
        error: `GitHub search failed (HTTP ${res.status})`,
      }
    }

    const data = (await res.json()) as GitHubRepoSearchResponse
    const items: ExternalSourceItem[] = (data.items ?? []).slice(0, limit).map((repo) => {
      const meta: Record<string, string | number> = {}
      if (typeof repo.stargazers_count === 'number') meta.stars = repo.stargazers_count
      if (repo.language) meta.language = repo.language
      return {
        title: repo.full_name ?? 'unknown',
        url: repo.html_url ?? '',
        description: repo.description ?? '',
        meta,
      }
    })

    return { source: 'github', status: 'ok', items, error: null }
  } catch {
    // Never surface the thrown error verbatim — it could echo the request,
    // and the request carries the token in its headers.
    return {
      source: 'github',
      status: 'error',
      items: [],
      error: 'GitHub search request failed',
    }
  }
}

// ── Hugging Face ──────────────────────────────────────────────────────────────

interface HFModelEntry {
  id?: string
  modelId?: string
  downloads?: number
  likes?: number
}

interface HFDatasetEntry {
  id?: string
  downloads?: number
  likes?: number
}

function hfHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function mapHFItem(
  id: string,
  kind: 'model' | 'dataset',
  downloads?: number,
  likes?: number
): ExternalSourceItem {
  const meta: Record<string, string | number> = { kind }
  if (typeof downloads === 'number') meta.downloads = downloads
  if (typeof likes === 'number') meta.likes = likes
  return {
    title: id,
    url: `https://huggingface.co/${id}`,
    description: '',
    meta,
  }
}

/**
 * Search Hugging Face for both models and datasets, merged into one result.
 * Works without a token (public API); an optional token raises rate limits.
 * The token is sent only as an Authorization header, never echoed.
 */
export async function searchHuggingFace(
  query: string,
  deps: ExternalSourceDeps
): Promise<ExternalSourceResult> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const token = deps.token ?? null
  const total = clampLimit(deps.limit)
  // Split the budget across models + datasets (models get the remainder).
  const datasetLimit = Math.floor(total / 2)
  const modelLimit = total - datasetLimit

  try {
    const headers = hfHeaders(token)
    const [modelsRes, datasetsRes] = await Promise.all([
      fetchImpl(
        `${HF_MODELS_API}?search=${encodeURIComponent(query)}&limit=${modelLimit}`,
        { headers }
      ),
      fetchImpl(
        `${HF_DATASETS_API}?search=${encodeURIComponent(query)}&limit=${datasetLimit}`,
        { headers }
      ),
    ])

    if (!modelsRes.ok || !datasetsRes.ok) {
      const status = modelsRes.ok ? datasetsRes.status : modelsRes.status
      return {
        source: 'huggingface',
        status: 'error',
        items: [],
        error: `Hugging Face search failed (HTTP ${status})`,
      }
    }

    const models = (await modelsRes.json()) as HFModelEntry[]
    const datasets = (await datasetsRes.json()) as HFDatasetEntry[]

    const items: ExternalSourceItem[] = []
    for (const m of Array.isArray(models) ? models.slice(0, modelLimit) : []) {
      const id = m.modelId ?? m.id
      if (id) items.push(mapHFItem(id, 'model', m.downloads, m.likes))
    }
    for (const d of Array.isArray(datasets) ? datasets.slice(0, datasetLimit) : []) {
      const id = d.id
      if (id) items.push(mapHFItem(id, 'dataset', d.downloads, d.likes))
    }

    return { source: 'huggingface', status: 'ok', items, error: null }
  } catch {
    return {
      source: 'huggingface',
      status: 'error',
      items: [],
      error: 'Hugging Face search request failed',
    }
  }
}

// ── Report assembly ───────────────────────────────────────────────────────────

/**
 * Run GitHub + Hugging Face searches concurrently and assemble the report.
 * Pure with respect to the environment: `generatedAt`, tokens, and `fetchImpl`
 * are all injected via `deps` so the assembly stays deterministic/testable.
 */
export async function researchExternalSources(
  query: string,
  deps: ExternalResearchDeps
): Promise<ExternalResearchReport> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const limit = clampLimit(deps.limit)

  const [github, huggingface] = await Promise.all([
    searchGitHubRepositories(query, {
      token: deps.githubToken ?? null,
      fetchImpl,
      limit,
    }),
    searchHuggingFace(query, {
      token: deps.hfToken ?? null,
      fetchImpl,
      limit,
    }),
  ])

  return {
    query,
    generatedAt: deps.generatedAt,
    sources: [github, huggingface],
  }
}
