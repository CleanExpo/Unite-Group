import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))
vi.mock('@/lib/ai/pipeline', () => ({
  runPipeline: vi.fn(),
  getPipeline: vi.fn(),
  registerPipeline: vi.fn(),
}))
vi.mock('@/lib/ai/pipelines/research-to-brief', () => ({ researchToBriefPipeline: {} }))
vi.mock('@/lib/ai/pipelines/bookkeeper-to-advisory', () => ({ bookkeeperToAdvisoryPipeline: {} }))
vi.mock('@/lib/ai/pipelines/competitor-intel', () => ({ competitorIntelPipeline: {} }))
vi.mock('@/lib/ai/pipelines/strategy-to-decision', () => ({ strategyToDecisionPipeline: {} }))
vi.mock('@/lib/ai/pipelines/synthex-content', () => ({ synthexContentPipeline: {} }))

import { getUser } from '@/lib/supabase/server'
import { runPipeline, getPipeline } from '@/lib/ai/pipeline'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/pipeline/run', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/pipeline/run', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ pipelineId: 'research-to-brief', seed: 'test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when pipelineId missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ seed: 'test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when seed missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ pipelineId: 'research-to-brief' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when pipeline not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getPipeline).mockReturnValue(undefined)
    const res = await POST(req({ pipelineId: 'unknown-pipeline', seed: 'test' }))
    expect(res.status).toBe(404)
  })

  it('returns pipeline result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getPipeline).mockReturnValue({ id: 'research-to-brief', steps: [{ capabilityId: 'research', buildInput: () => ({}) }] } as any)
    vi.mocked(runPipeline).mockResolvedValue({
      pipelineId: 'research-to-brief',
      steps: [{ capabilityId: 'research', output: { content: 'Result', citations: [], usage: {} } }],
      finalOutput: { content: 'Final result', citations: [], model: 'claude-3', usage: {} },
    } as any)
    const res = await POST(req({ pipelineId: 'research-to-brief', seed: 'analyse market' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.finalOutput.content).toBe('Final result')
  })
})
