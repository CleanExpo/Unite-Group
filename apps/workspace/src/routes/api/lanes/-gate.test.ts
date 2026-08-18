import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const requireLocalOrAuthMock = vi.fn(() => true)
let decisionsPath = ''

vi.mock('../../../server/auth-middleware', () => ({
  requireLocalOrAuth: requireLocalOrAuthMock,
}))

vi.mock('../../../server/lanes', () => ({
  gateDecisionsPath: () => decisionsPath,
}))

let root = ''
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'gate-route-'))
  decisionsPath = path.join(root, 'decisions.jsonl')
  requireLocalOrAuthMock.mockReturnValue(true)
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function decision(overrides: Record<string, unknown> = {}) {
  return {
    at: '2026-01-01T00:00:00.000Z',
    requestId: 'run-1',
    adapter: 'claude-code',
    tier: 'L0',
    allowed: true,
    safeSummary: 'L0 · Read · claude-code',
    reason: "'Read' only reads",
    failedClosed: false,
    ...overrides,
  }
}

async function get(url: string): Promise<Response> {
  const { Route } = await import('./gate')
  const handlers = Route.options.server?.handlers as {
    GET: (ctx: { request: Request }) => Promise<Response>
  }
  return handlers.GET({ request: new Request(url) })
}

const URL_BASE = 'http://localhost/api/lanes/gate'

describe('GET /api/lanes/gate', () => {
  it('denies an unauthenticated remote caller', async () => {
    requireLocalOrAuthMock.mockReturnValue(false)
    expect((await get(`${URL_BASE}?runId=run-1`)).status).toBe(401)
  })

  it('rejects a missing or path-shaped runId', async () => {
    expect((await get(URL_BASE)).status).toBe(400)
    expect((await get(`${URL_BASE}?runId=${encodeURIComponent('../../etc')}`)).status).toBe(400)
  })

  it('returns the decisions the hook recorded', async () => {
    await writeFile(
      decisionsPath,
      [
        JSON.stringify(decision()),
        JSON.stringify(
          decision({ tier: 'L3', allowed: false, safeSummary: 'L3 · Bash · claude-code' }),
        ),
      ].join('\n'),
    )
    const body = await (await get(`${URL_BASE}?runId=run-1`)).json()
    expect(body.ok).toBe(true)
    expect(body.recorded).toBe(true)
    expect(body.decisions).toHaveLength(2)
    expect(body.blocked).toBe(1)
  })

  it('distinguishes "no file" from "nothing blocked"', async () => {
    // A run that recorded nothing is NOT a clean run, and reporting it as one
    // would let a lane that never reached the gate look gated.
    const body = await (await get(`${URL_BASE}?runId=run-1`)).json()
    expect(body.ok).toBe(true)
    expect(body.recorded).toBe(false)
    expect(body.decisions).toEqual([])
  })

  it('survives a corrupt line rather than blanking the audit', async () => {
    await writeFile(decisionsPath, `{oops\n${JSON.stringify(decision())}\n`)
    const body = await (await get(`${URL_BASE}?runId=run-1`)).json()
    expect(body.decisions).toHaveLength(1)
  })

  it('reports a genuine read failure as an error, not as an empty run', async () => {
    // A directory where a file should be: reading it fails with EISDIR, which
    // must not be laundered into "no decisions".
    await mkdir(decisionsPath, { recursive: true })
    expect((await get(`${URL_BASE}?runId=run-1`)).status).toBe(500)
  })
})
