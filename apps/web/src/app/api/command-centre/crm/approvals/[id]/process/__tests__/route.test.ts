// UNI-2234 — POST /api/command-centre/crm/approvals/[id]/process (slice 2).
// Auth gate + lifecycle admission + evidence journaling + the dispatch-disabled invariant.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/crm/auto-exec-matrix', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/crm/auto-exec-matrix')>()),
  journalAutoExecution: vi.fn().mockResolvedValue(undefined),
}))

import { getUser } from '@/lib/supabase/server'
import { journalAutoExecution } from '@/lib/crm/auto-exec-matrix'
import { POST } from '../route'

const params = (id = 'appr_1') => ({ params: Promise.resolve({ id }) })
const req = (b: unknown) =>
  new Request('https://app.test/api/command-centre/crm/approvals/appr_1/process', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof b === 'string' ? b : JSON.stringify(b),
  })

const approvedLead = {
  subjectType: 'lead_conversion',
  status: 'approved',
  approvedBy: 'phill',
  approvalReference: 'ref-1',
  requestedAt: '2026-07-09T00:00:00.000Z',
  now: '2026-07-09T00:01:00.000Z',
}

describe('POST /api/command-centre/crm/approvals/[id]/process', () => {
  const originalKillSwitch = process.env.CRM_AUTO_EXECUTE
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    if (originalKillSwitch === undefined) delete process.env.CRM_AUTO_EXECUTE
    else process.env.CRM_AUTO_EXECUTE = originalKillSwitch
  })

  it('401 without a session', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await POST(req(approvedLead), params())).status).toBe(401)
  })

  it('400 on invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req('{not json'), params())).status).toBe(400)
  })

  it('400 when subjectType is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ status: 'approved' }), params())).status).toBe(400)
  })

  it('routes an approved lead_conversion to needs-review while the kill switch is off, and journals it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    delete process.env.CRM_AUTO_EXECUTE
    const res = await POST(req(approvedLead), params())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('appr_1')
    expect(json.admitted).toBe(false)
    expect(json.state).toBe('needs_review')
    expect(json.dispatchEnabled).toBe(false)
    expect(journalAutoExecution).toHaveBeenCalledTimes(1)
    expect(vi.mocked(journalAutoExecution).mock.calls[0][0]).toMatchObject({
      kind: 'crm_approval_admission',
    })
  })

  it('never enables dispatch even with the kill switch on (Board gate holds at the route)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.CRM_AUTO_EXECUTE = '1'
    const res = await POST(req(approvedLead), params())
    const json = await res.json()
    // evaluateCrmApprovalLifecycle passes no auto-exec signals, so even with the
    // kill switch on it stays needs-review; dispatch is never enabled by this route.
    expect(json.dispatchEnabled).toBe(false)
    expect(json.state).toBe('needs_review')
  })
})
