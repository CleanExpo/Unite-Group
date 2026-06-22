import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/integrations/linear', () => ({
  fetchClaimCandidates: vi.fn(),
  resolveStateId: vi.fn(),
  updateIssueState: vi.fn(),
  addComment: vi.fn(),
}))

import {
  fetchClaimCandidates,
  resolveStateId,
  updateIssueState,
  addComment,
} from '@/lib/integrations/linear'
import { GET } from '../route'

const mockFetchClaimCandidates = vi.mocked(fetchClaimCandidates)
const mockResolveStateId = vi.mocked(resolveStateId)
const mockUpdateIssueState = vi.mocked(updateIssueState)
const mockAddComment = vi.mocked(addComment)
const originalCronSecret = process.env.CRON_SECRET
const originalLiveGate = process.env.CC_LINEAR_LIVE

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
    // Default: gate OFF → read-only dry-run (most tests assert this).
    delete process.env.CC_LINEAR_LIVE
  })

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalCronSecret
    if (originalLiveGate === undefined) delete process.env.CC_LINEAR_LIVE
    else process.env.CC_LINEAR_LIVE = originalLiveGate
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

  it('makes no mutating Linear calls in the dry-run default', async () => {
    mockFetchClaimCandidates.mockResolvedValue([candidate()] as never)

    await GET(request())

    expect(mockUpdateIssueState).not.toHaveBeenCalled()
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('atomically claims the handed-off issue when CC_LINEAR_LIVE=1', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    mockFetchClaimCandidates.mockResolvedValue([candidate()] as never)
    mockResolveStateId.mockResolvedValue('state-in-progress' as never)
    mockUpdateIssueState.mockResolvedValue(undefined as never)
    mockAddComment.mockResolvedValue(undefined as never)

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      mode: 'live',
      stop_reason: 'claimed',
      next_action: 'claim_and_build',
      claimed: { identifier: 'UNI-3001', from_state: 'Todo' },
      execution_packet: { issue: { identifier: 'UNI-3001' } },
    })
    // The issue it hands off is moved to In Progress + receipt posted, so the
    // next tick can't re-claim it (no duplicate PRs).
    expect(mockResolveStateId).toHaveBeenCalledWith('UNI', 'In Progress')
    expect(mockUpdateIssueState).toHaveBeenCalledWith('issue-1', 'state-in-progress')
    expect(mockAddComment).toHaveBeenCalledWith('issue-1', expect.stringContaining('Claimed'))
  })
})
