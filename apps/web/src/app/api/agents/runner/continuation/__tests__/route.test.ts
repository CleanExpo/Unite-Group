import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/mission-authority/continuation', async (orig) => {
  const actual = await orig<typeof import('@/lib/mission-authority/continuation')>()
  return { ...actual, resolveMissionAuthority: vi.fn() }
})

import policy from '../../../../../../../../../scripts/nexus-runner/mission-authority.json'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveMissionAuthority } from '@/lib/mission-authority/continuation'
import type { MissionAuthority } from '@/lib/mission-authority/may'
import { GET, POST } from '../route'

const SECRET = 'test-secret'
const TASK_ID = '4f8a2c1e-6f6d-4c3a-9a2b-1e5d7c9b0a3f'
const INTENT_HASH = 'b'.repeat(64)
const AUTHORITY: MissionAuthority = {
  missionId: TASK_ID, intentHash: INTENT_HASH, intentVersion: 1, admissionReceipt: 'approval-1',
  authorityVersion: policy.schema, allowedActions: Object.keys(policy.build),
  releaseMandate: { classes: [], maxRisk: 'low' }, expiresAt: null, revokedAt: null,
}
const CONTINUATION = {
  mission_id: TASK_ID, intent_hash: INTENT_HASH, authority_version: policy.schema, phase: 'BUILD_CONTINUE',
  status: 'active', candidate_sha: null, last_verified_sha: null, next_action: 'test', blocked_reason: null,
  attempt_count: 0, receipts: [],
}

/** One running cc_tasks row claimed by `runner-1`; updates honour every eq() filter. */
function database() {
  let row: Record<string, unknown> = {
    id: TASK_ID, founder_id: 'founder-1', external_ref: null, status: 'running', claimed_by: 'runner-1',
    risk_level: 'low', metadata: {}, updated_at: '2026-09-27T00:00:00.000Z',
  }
  const read = { eq: () => read, single: async () => ({ data: structuredClone(row), error: null }) }
  const update = vi.fn((values: Record<string, unknown>) => {
    const filters: Array<[string, unknown]> = []
    const mutation = {
      eq: (column: string, value: unknown) => { filters.push([column, value]); return mutation },
      select: async () => {
        if (!filters.every(([column, value]) => row[column] === value)) return { data: [], error: null }
        row = structuredClone({ ...row, ...values })
        return { data: [row], error: null }
      },
    }
    return mutation
  })
  return { client: { from: () => ({ select: () => read, update }) }, update, current: () => row }
}

function req(method: 'GET' | 'POST', body?: unknown, auth: string | null = `Bearer ${SECRET}`) {
  const url = `https://app.test/api/agents/runner/continuation${method === 'GET' ? `?taskId=${TASK_ID}` : ''}`
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

const post = (overrides: Record<string, unknown> = {}, continuation: Record<string, unknown> = {}) =>
  req('POST', { taskId: TASK_ID, runnerId: 'runner-1', expectedUpdatedAt: null, continuation: { ...CONTINUATION, ...continuation }, ...overrides })

describe('/api/agents/runner/continuation', () => {
  let db: ReturnType<typeof database>
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('AGENT_EVENTS_SECRET', SECRET)
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    db = database()
    vi.mocked(createServiceClient).mockReturnValue(db.client as never)
    vi.mocked(resolveMissionAuthority).mockResolvedValue(AUTHORITY)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('401s a missing, wrong or dormant bearer on both verbs before touching the database', async () => {
    expect((await GET(req('GET', undefined, null))).status).toBe(401)
    expect((await POST(req('POST', {}, 'Bearer test-secreu'))).status).toBe(401)
    vi.stubEnv('AGENT_EVENTS_SECRET', '')
    expect((await GET(req('GET'))).status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('round-trips: POST saves, GET returns the saved continuation', async () => {
    const saved = await POST(post())
    expect(saved.status).toBe(200)
    const body = await saved.json()
    expect(body.decision).toMatchObject({ execute: true, action: 'test' })
    const loaded = await (await GET(req('GET'))).json()
    expect(loaded.continuation).toEqual({ ...CONTINUATION, updated_at: body.continuation.updated_at })
  })

  it('403s an action the policy does not map, and an action the mission has no authority for, writing nothing', async () => {
    const unmapped = await POST(post({}, { next_action: 'rename_repository' }))
    expect(unmapped.status).toBe(403)
    vi.mocked(resolveMissionAuthority).mockResolvedValue(null)
    const noAuthority = await POST(post())
    expect(noAuthority.status).toBe(403)
    expect(db.update).not.toHaveBeenCalled()
    expect(db.current().metadata).toEqual({})
  })

  it('saves a protected next action as a boundary rather than refusing it', async () => {
    const res = await POST(post({}, { next_action: 'promote_production', phase: 'RELEASE_CANDIDATE' }))
    expect(res.status).toBe(200)
    expect((await res.json()).decision).toMatchObject({ execute: false, boundary: 'PROTECTED_RELEASE' })
  })

  it('409s a stale write and leaves the stored continuation unchanged', async () => {
    expect((await POST(post())).status).toBe(200)
    const before = structuredClone(db.current())
    const stale = await POST(post({ expectedUpdatedAt: null }, { next_action: 'commit' }))
    expect(stale.status).toBe(409)
    expect(db.current()).toEqual(before)
  })

  it('404s a write from a runner that does not hold the claim', async () => {
    expect((await POST(post({ runnerId: 'runner-2' }))).status).toBe(404)
    expect(db.update).not.toHaveBeenCalled()
  })
})
