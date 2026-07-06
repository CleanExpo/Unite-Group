// Regression coverage — GET /api/command-centre/portfolio-health
// Auth gate, honest not_configured state (no GITHUB_TOKEN), the live GitHub +
// Linear aggregation with red/yellow/green mapping, partial/error sources, and
// that neither the GITHUB_TOKEN nor the LINEAR_API_KEY ever reaches the body.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const ORIGINAL_ENV = { ...process.env }

function ghRuns(conclusions: Array<string | null>) {
  return new Response(
    JSON.stringify({
      workflow_runs: conclusions.map((c, i) => ({
        conclusion: c,
        status: 'completed',
        html_url: `https://github.com/run/${i}`,
        updated_at: '2026-07-05T02:00:00Z',
      })),
    }),
    { status: 200 },
  )
}

function linearCount(n: number) {
  return new Response(JSON.stringify({ data: { issues: { nodes: Array.from({ length: n }, (_, i) => ({ id: `i${i}` })) } } }), { status: 200 })
}

/** Route fetch by host: GitHub runs vs Linear GraphQL. */
function routeFetch(handlers: { github: (url: string) => Response; linear: () => Response }) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    if (u.includes('api.linear.app')) return handlers.linear()
    return handlers.github(u)
  })
}

describe('GET /api/command-centre/portfolio-health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.GITHUB_TOKEN
    delete process.env.LINEAR_API_KEY
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('reports configured:false (not_configured) when GITHUB_TOKEN is absent', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { configured: boolean; source: string; repos: unknown[]; overall: string }
    expect(body.configured).toBe(false)
    expect(body.source).toBe('not_configured')
    expect(body.repos).toEqual([])
    expect(body.overall).toBe('grey')
  })

  it('aggregates live CI + Linear P0/P1 and maps red/yellow/green; never echoes secrets', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.GITHUB_TOKEN = 'ghp-super-secret'
    process.env.LINEAR_API_KEY = 'lin-super-secret'

    // RestoreAssist → clean success (green); Synthex → latest failure (red);
    // Nexus (Unite-Group) → success but a fail in the window (yellow).
    const fetchMock = routeFetch({
      github: (u) => {
        if (u.includes('/RestoreAssist/')) return ghRuns(['success', 'success'])
        if (u.includes('/Synthex/')) return ghRuns(['failure', 'success'])
        return ghRuns(['success', 'failure', 'success'])
      },
      linear: () => linearCount(2),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const bodyText = await res.text()
    const body = JSON.parse(bodyText) as {
      configured: boolean; source: string; overall: string; openP0P1: number; linearSource: string
      repos: Array<{ repo: string; color: string; failCountLast10: number }>
    }

    expect(body.configured).toBe(true)
    expect(body.source).toBe('github_live')
    expect(body.linearSource).toBe('linear_live')
    expect(body.openP0P1).toBe(2)

    const byRepo = Object.fromEntries(body.repos.map((r) => [r.repo, r]))
    expect(byRepo.RestoreAssist.color).toBe('green')
    expect(byRepo.Synthex.color).toBe('red')
    expect(byRepo.Nexus.color).toBe('yellow')
    expect(byRepo.Nexus.failCountLast10).toBe(1)
    expect(body.overall).toBe('red') // worst wins

    // Secrets only travelled as outbound headers — never in the response body.
    expect(bodyText).not.toContain('ghp-super-secret')
    expect(bodyText).not.toContain('lin-super-secret')
  })

  it('surfaces source:partial when some repos fail and linearSource:not_configured without a key', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.GITHUB_TOKEN = 'ghp-x'

    const fetchMock = routeFetch({
      github: (u) => {
        if (u.includes('/Synthex/')) return new Response('nope', { status: 500 })
        return ghRuns(['success'])
      },
      linear: () => linearCount(0),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    const body = (await res.json()) as { source: string; linearSource: string; openP0P1: number | null; repos: Array<{ repo: string; color: string }> }
    expect(body.source).toBe('partial')
    expect(body.linearSource).toBe('not_configured')
    expect(body.openP0P1).toBeNull()
    const synthex = body.repos.find((r) => r.repo === 'Synthex')!
    expect(synthex.color).toBe('grey')
  })
})
