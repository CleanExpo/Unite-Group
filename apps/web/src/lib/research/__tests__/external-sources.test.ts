import { describe, it, expect } from 'vitest'
import {
  searchGitHubRepositories,
  searchHuggingFace,
  researchExternalSources,
} from '../external-sources'

const SECRET = 'ghp_super_secret_token_value'

// ── Fake fetch helpers (no real network) ──────────────────────────────────────

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

/** Routes fake responses by URL substring. */
function fakeFetch(handlers: Array<{ match: string; response: Response | (() => Response) }>) {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    for (const h of handlers) {
      if (url.includes(h.match)) {
        return typeof h.response === 'function' ? h.response() : h.response
      }
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as unknown as typeof fetch
}

// ── GitHub ────────────────────────────────────────────────────────────────────

describe('searchGitHubRepositories', () => {
  it('maps repositories to items on success', async () => {
    const fetchImpl = fakeFetch([
      {
        match: 'api.github.com/search/repositories',
        response: jsonResponse({
          items: [
            {
              full_name: 'openai/whisper',
              html_url: 'https://github.com/openai/whisper',
              description: 'Robust speech recognition',
              stargazers_count: 60000,
              language: 'Python',
            },
          ],
        }),
      },
    ])

    const result = await searchGitHubRepositories('whisper', { token: SECRET, fetchImpl })

    expect(result.source).toBe('github')
    expect(result.status).toBe('ok')
    expect(result.error).toBeNull()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual({
      title: 'openai/whisper',
      url: 'https://github.com/openai/whisper',
      description: 'Robust speech recognition',
      meta: { stars: 60000, language: 'Python' },
    })
  })

  it('returns not_configured when no token', async () => {
    const result = await searchGitHubRepositories('whisper', { token: null })
    expect(result.status).toBe('not_configured')
    expect(result.items).toEqual([])
    expect(result.error).toBeNull()
  })

  it('returns error on non-2xx response', async () => {
    const fetchImpl = fakeFetch([
      { match: 'api.github.com', response: jsonResponse({}, false, 403) },
    ])
    const result = await searchGitHubRepositories('whisper', { token: SECRET, fetchImpl })
    expect(result.status).toBe('error')
    expect(result.items).toEqual([])
    expect(result.error).toContain('403')
  })

  it('returns error when fetch throws', async () => {
    const fetchImpl = (async () => {
      throw new Error(`boom request with ${SECRET}`)
    }) as unknown as typeof fetch
    const result = await searchGitHubRepositories('whisper', { token: SECRET, fetchImpl })
    expect(result.status).toBe('error')
    expect(result.error).not.toContain(SECRET)
  })
})

// ── Hugging Face ──────────────────────────────────────────────────────────────

describe('searchHuggingFace', () => {
  it('merges models and datasets without a token', async () => {
    const fetchImpl = fakeFetch([
      {
        match: '/api/models',
        response: jsonResponse([
          { modelId: 'bert-base-uncased', downloads: 1000000, likes: 500 },
        ]),
      },
      {
        match: '/api/datasets',
        response: jsonResponse([{ id: 'squad', downloads: 50000, likes: 120 }]),
      },
    ])

    const result = await searchHuggingFace('bert', { fetchImpl, limit: 4 })

    expect(result.source).toBe('huggingface')
    expect(result.status).toBe('ok')
    expect(result.error).toBeNull()

    const model = result.items.find((i) => i.meta?.kind === 'model')
    const dataset = result.items.find((i) => i.meta?.kind === 'dataset')

    expect(model).toMatchObject({
      title: 'bert-base-uncased',
      url: 'https://huggingface.co/bert-base-uncased',
      meta: { kind: 'model', downloads: 1000000, likes: 500 },
    })
    expect(dataset).toMatchObject({
      title: 'squad',
      url: 'https://huggingface.co/squad',
      meta: { kind: 'dataset', downloads: 50000, likes: 120 },
    })
  })

  it('returns error when a sub-request fails', async () => {
    const fetchImpl = fakeFetch([
      { match: '/api/models', response: jsonResponse([], false, 500) },
      { match: '/api/datasets', response: jsonResponse([]) },
    ])
    const result = await searchHuggingFace('bert', { fetchImpl })
    expect(result.status).toBe('error')
    expect(result.items).toEqual([])
    expect(result.error).toContain('500')
  })

  it('returns error when fetch throws and never echoes the token', async () => {
    const hfToken = 'hf_secret_token'
    const fetchImpl = (async () => {
      throw new Error(`network failure with ${hfToken}`)
    }) as unknown as typeof fetch
    const result = await searchHuggingFace('bert', { fetchImpl, token: hfToken })
    expect(result.status).toBe('error')
    expect(result.error).not.toContain(hfToken)
  })
})

// ── Report assembly ───────────────────────────────────────────────────────────

describe('researchExternalSources', () => {
  it('assembles a report with both sources present', async () => {
    const fetchImpl = fakeFetch([
      {
        match: 'api.github.com',
        response: jsonResponse({
          items: [
            {
              full_name: 'a/b',
              html_url: 'https://github.com/a/b',
              description: 'x',
              stargazers_count: 10,
              language: 'TypeScript',
            },
          ],
        }),
      },
      { match: '/api/models', response: jsonResponse([{ id: 'm1', downloads: 1, likes: 2 }]) },
      { match: '/api/datasets', response: jsonResponse([{ id: 'd1' }]) },
    ])

    const report = await researchExternalSources('embeddings', {
      githubToken: SECRET,
      hfToken: null,
      fetchImpl,
      generatedAt: '2026-06-17T00:00:00.000Z',
    })

    expect(report.query).toBe('embeddings')
    expect(report.generatedAt).toBe('2026-06-17T00:00:00.000Z')
    expect(report.sources.map((s) => s.source)).toEqual(['github', 'huggingface'])
    expect(report.sources[0].status).toBe('ok')
    expect(report.sources[1].status).toBe('ok')
  })

  it('reports github not_configured when token absent, hf still ok', async () => {
    const fetchImpl = fakeFetch([
      { match: '/api/models', response: jsonResponse([]) },
      { match: '/api/datasets', response: jsonResponse([]) },
    ])

    const report = await researchExternalSources('q', {
      githubToken: null,
      hfToken: null,
      fetchImpl,
      generatedAt: '2026-06-17T00:00:00.000Z',
    })

    const gh = report.sources.find((s) => s.source === 'github')!
    const hf = report.sources.find((s) => s.source === 'huggingface')!
    expect(gh.status).toBe('not_configured')
    expect(hf.status).toBe('ok')
  })

  it('never leaks any token into the serialised report, even on error', async () => {
    const fetchImpl = (async () => {
      throw new Error(`fail ${SECRET}`)
    }) as unknown as typeof fetch

    const report = await researchExternalSources('q', {
      githubToken: SECRET,
      hfToken: 'hf_secret_token',
      fetchImpl,
      generatedAt: '2026-06-17T00:00:00.000Z',
    })

    const serialised = JSON.stringify(report)
    expect(serialised).not.toContain(SECRET)
    expect(serialised).not.toContain('hf_secret_token')
    expect(report.sources.every((s) => s.status === 'error')).toBe(true)
  })
})
