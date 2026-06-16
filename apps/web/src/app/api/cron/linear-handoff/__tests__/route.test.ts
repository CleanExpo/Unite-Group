import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/integrations/linear', () => ({
  fetchClaimCandidates: vi.fn(),
}))

import { fetchClaimCandidates } from '@/lib/integrations/linear'
import { GET } from '../route'

const mockFetchClaimCandidates = vi.mocked(fetchClaimCandidates)
const originalCronSecret = process.env.CRON_SECRET

function request(auth = 'Bearer test-cron-secret') {
  return new Request('https://unite.test/api/cron/linear-handoff', {
    headers: { authorization: auth },
  })
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'issue-1',
    identifier: 'UNI-3001',
    title: 'Build the next autonomous slice',
    priority: 2,
    description: '## Acceptance Criteria\n- [ ] Ship the smallest verified slice.',
    url: 'https://linear.app/unite-group/issue/UNI-3001',
    createdAt: '2026-06-17T00:00:00.000Z',
    state: { id: 'state-1', name: 'Todo', type: 'unstarted' },
    labels: { nodes: [{ id: 'label-1', name: 'pi-dev:autonomous' }] },
    ...overrides,
  }
}

describe('GET /api/cron/linear-handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalCronSecret
  })

  it('returns 401 when the cron bearer token is missing or wrong', async () => {
    const res = await GET(request('Bearer nope'))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'Unauthorised' })
    expect(mockFetchClaimCandidates).not.toHaveBeenCalled()
  })

  it('returns a dry-run execution packet for the next claimable Linear issue', async () => {
    mockFetchClaimCandidates.mockResolvedValue([candidate()] as never)

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      source: 'command-centre:linear-handoff',
      mode: 'dry-run',
      stop_reason: 'dry-run',
      next_action: 'claim_and_build',
      execution_packet: {
        source: 'command-centre:linear-claim',
        runner: 'rana-cli',
        branchName: 'pidev/auto-uni-3001',
        issue: { identifier: 'UNI-3001' },
      },
    })
    expect(mockFetchClaimCandidates).toHaveBeenCalledWith({
      teamKey: 'UNI',
      projectName: 'Unite-Group',
      labelNames: ['mesh:auto', 'pi-dev:autonomous'],
    })
  })

  it('returns idle when no eligible handoff exists', async () => {
    mockFetchClaimCandidates.mockResolvedValue([] as never)

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      mode: 'dry-run',
      stop_reason: 'no-eligible-work',
      next_action: 'idle',
      execution_packet: null,
    })
  })
})
