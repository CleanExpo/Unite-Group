import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn(() => ({ service: true })) }))
vi.mock('../../claim/route', () => ({ containmentGranted: vi.fn(() => true) }))
vi.mock('@/lib/command-centre/idea-research-store', async original => ({ ...await original<typeof import('@/lib/command-centre/idea-research-store')>(), operateIdeaResearch: vi.fn(), readSignedResearchRun: vi.fn() }))
import { containmentGranted } from '../../claim/route'
import { operateIdeaResearch, readSignedResearchRun } from '@/lib/command-centre/idea-research-store'
import { createIdeaLifecycle, applyLifecycleCommand } from '@/lib/command-centre/idea-lifecycle'
import { ResearchConflict, type ResearchRun } from '@/lib/command-centre/idea-research'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import { POST } from '../route'

const founderId = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const runId = 'b0000000-0000-4000-8000-000000000003'
const context = { actorId: founderId, now: '2026-10-15T00:00:00.000Z' }
const lifecycle = applyLifecycleCommand(createIdeaLifecycle({ title: 'Idea', rawIdea: 'Research public choices', requestId: runId }, context), { action: 'set_mandate', taskId, expectedRevision: 1, mandate: { objective: 'Read public sources', allowedSources: ['Public documentation'], maximumSources: 5, spendLimitMinor: 0, currency: 'AUD', paidApiAllowed: false } }, context)
const task = { id: taskId, founder_id: founderId, metadata: { lifecycle }, status: 'proposed' } as unknown as CommandCentreTask
const claim = { action: 'claim', taskId, runId, runnerId: 'registered-runner' }
const req = (body: unknown, bearer = 'test-only-runner-key') => new Request('https://app.test/api/agents/runner/research', { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('AGENT_EVENTS_SECRET', 'test-only-runner-key'); vi.stubEnv('FOUNDER_USER_ID', founderId); vi.stubEnv('MISSION_LANE_HARD_STOP', '')
  vi.mocked(containmentGranted).mockReturnValue(true)
  vi.mocked(operateIdeaResearch).mockResolvedValue({ task, continue: true })
  vi.mocked(readSignedResearchRun).mockReturnValue({ id: runId, lease: { token: runId, runnerId: 'registered-runner' } } as ResearchRun)
})
afterEach(() => vi.unstubAllEnvs())

describe('existing runner-authenticated public research transport', () => {
  it('requires the existing bearer, configured founder and registered runner grant', async () => {
    expect((await POST(req(claim, 'wrong'))).status).toBe(401)
    vi.stubEnv('AGENT_EVENTS_SECRET', '')
    expect((await POST(req(claim))).status).toBe(401)
    vi.stubEnv('AGENT_EVENTS_SECRET', 'test-only-runner-key'); vi.stubEnv('FOUNDER_USER_ID', '')
    expect((await POST(req(claim))).status).toBe(503)
    vi.stubEnv('FOUNDER_USER_ID', founderId); vi.mocked(containmentGranted).mockReturnValue(false)
    expect((await POST(req(claim))).status).toBe(403)
    expect(operateIdeaResearch).not.toHaveBeenCalled()
  })
  it('sends only server-scoped founder and validated command to the CAS service; claim exports the model schema', async () => {
    const response = await POST(req(claim))
    expect(response.status).toBe(200)
    expect(operateIdeaResearch).toHaveBeenCalledWith(founderId, claim, { client: { service: true } })
    const body = await response.json()
    expect(body.input).toMatchObject({ rawIdea: lifecycle.rawIdea, mandate: lifecycle.mandate })
    expect(body.research.lease.token).toBe(runId)
    expect(body.resultSchema.properties.kind.const).toBe('untrusted_research_proposal')
    expect(body.resultSchema.$schema).toContain('draft-07')
  })
  it('rejects actor, authority, paid API fields and oversized actual bytes before mutation', async () => {
    for (const extra of [{ founderId }, { actor: 'founder' }, { signature: 'fake' }, { paidApiAllowed: true }]) expect((await POST(req({ ...claim, ...extra }))).status).toBe(400)
    const large = req({ ...claim, result: 'x'.repeat(1024 * 1024) }); large.headers.set('Content-Length', '1')
    expect((await POST(large)).status).toBe(400)
    expect(operateIdeaResearch).not.toHaveBeenCalled()
  })
  it('refuses stale/cancelled leases with a mandatory stop signal and acknowledges successful terminal finish separately', async () => {
    vi.mocked(operateIdeaResearch).mockRejectedValueOnce(new ResearchConflict('Cancelled or stale'))
    const stopped = await POST(req({ action: 'heartbeat', taskId, runId, runnerId: claim.runnerId, leaseToken: runId }))
    expect(stopped.status).toBe(409)
    expect(await stopped.json()).toMatchObject({ continue: false })
    vi.mocked(operateIdeaResearch).mockResolvedValueOnce({ task, continue: false })
    const finish = await POST(req({ action: 'finish', taskId, runId, runnerId: claim.runnerId, leaseToken: runId, result: { schemaVersion: 1, kind: 'untrusted_research_proposal', summary: 'Review the proposal', sources: [], claims: [], openDecisions: [], options: [], proposedBrief: null } }))
    expect(finish.status).toBe(200)
    expect(await finish.json()).toMatchObject({ continue: false })
  })
})
