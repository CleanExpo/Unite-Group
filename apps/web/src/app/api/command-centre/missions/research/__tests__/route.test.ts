import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/idea-research-store', async original => ({ ...await original<typeof import('@/lib/command-centre/idea-research-store')>(), readIdeaResearch: vi.fn(), startIdeaResearch: vi.fn(), changeIdeaResearch: vi.fn(), readSignedResearchRun: vi.fn(), researchSigningAvailable: vi.fn(() => true) }))
import { getUser } from '@/lib/supabase/server'
import { readIdeaResearch, startIdeaResearch, changeIdeaResearch, readSignedResearchRun } from '@/lib/command-centre/idea-research-store'
import { DeliveryConflict, DeliveryNotFound } from '@/lib/command-centre/delivery-store'
import type { ResearchRun } from '@/lib/command-centre/idea-research'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import { GET, POST } from '../route'

const founderId = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const runId = 'b0000000-0000-4000-8000-000000000003'
const input = { action: 'start', taskId, expectedRevision: 2, requestId: runId, allowedDomains: ['example.com'], limits: { maximumSources: 5, timeLimitMinutes: 5, maxTurns: 4, concurrency: 1 } }
const task = { id: taskId, founder_id: founderId, metadata: {}, status: 'proposed' } as CommandCentreTask
const req = (body: unknown) => new Request('https://app.test/api/command-centre/missions/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: founderId } as never)
  vi.mocked(readIdeaResearch).mockResolvedValue({ task, research: null, authorityCurrent: false })
  vi.mocked(readSignedResearchRun).mockReturnValue(null)
  vi.mocked(startIdeaResearch).mockResolvedValue({ task, deduplicated: false })
  vi.mocked(changeIdeaResearch).mockResolvedValue(task)
})
afterEach(() => vi.unstubAllEnvs())

describe('founder-owned bounded research transport', () => {
  it('requires auth before reads or any start operation', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await GET(new Request(`https://app.test/api/command-centre/missions/research?taskId=${taskId}`))).status).toBe(401)
    expect((await POST(req(input))).status).toBe(401)
    expect(startIdeaResearch).not.toHaveBeenCalled()
    expect(readIdeaResearch).not.toHaveBeenCalled()
  })
  it('requires JSON and same-origin writes while allowing originless terminal clients', async () => {
    const cross = req(input); cross.headers.set('Origin', 'https://sibling.app.test')
    expect((await POST(cross)).status).toBe(403)
    const site = req(input); site.headers.set('Sec-Fetch-Site', 'cross-site')
    expect((await POST(site)).status).toBe(403)
    const plain = req(input); plain.headers.set('Content-Type', 'text/plain')
    expect((await POST(plain)).status).toBe(400)
    expect(startIdeaResearch).not.toHaveBeenCalled()
    expect((await POST(req(input))).status).toBe(200)
    expect(startIdeaResearch).toHaveBeenCalledWith(founderId, input)
  })
  it('rejects forged actor, lease and provider fields and actual oversized bytes', async () => {
    for (const extra of [{ actorId: founderId }, { leaseToken: runId }, { verified: true }, { paidApiAllowed: true }]) expect((await POST(req({ ...input, ...extra }))).status).toBe(400)
    const large = req({ ...input, note: 'x'.repeat(1024 * 1024) }); large.headers.set('Content-Length', '1')
    expect((await POST(large)).status).toBe(400)
    expect(startIdeaResearch).not.toHaveBeenCalled()
  })
  it('does not expose worker lease authentication or claim a connected monthly account', async () => {
    vi.mocked(readSignedResearchRun).mockReturnValue({ id: runId, state: 'running', lease: { token: runId, runnerId: 'registered-runner', expiresAt: '2026-10-15T00:01:00.000Z' } } as ResearchRun)
    const response = await GET(new Request(`https://app.test/api/command-centre/missions/research?taskId=${taskId}`))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.research.lease.token).toBeUndefined()
    expect(body.readiness).toEqual({ signingAvailable: true, runnerConnection: 'unknown', subscriptionAllowance: 'unknown', paidApiFallback: false })
    expect(readIdeaResearch).toHaveBeenCalledWith(founderId, taskId)
  })
  it('scopes cancel/retry to authenticated owner and surfaces not-found, stale and persistence failures', async () => {
    expect((await POST(req({ action: 'cancel', taskId, runId, expectedRevision: 2 }))).status).toBe(200)
    expect(changeIdeaResearch).toHaveBeenCalledWith(founderId, { action: 'cancel', taskId, runId, expectedRevision: 2 })
    vi.mocked(readIdeaResearch).mockRejectedValueOnce(new DeliveryNotFound())
    expect((await GET(new Request(`https://app.test/api/command-centre/missions/research?taskId=${taskId}`))).status).toBe(404)
    vi.mocked(startIdeaResearch).mockRejectedValueOnce(new DeliveryConflict())
    expect((await POST(req(input))).status).toBe(409)
    vi.mocked(startIdeaResearch).mockRejectedValueOnce(new Error('private database error'))
    const unavailable = await POST(req(input))
    expect(unavailable.status).toBe(503)
    expect(await unavailable.text()).not.toContain('private database error')
  })
})
