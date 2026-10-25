import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/campaigns/drip-processor', () => ({ processCampaignDrip: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { processCampaignDrip } from '@/lib/campaigns/drip-processor'
import { DripSendBlockedError } from '@/lib/campaigns/drip-errors'
import { POST } from '../route'

const campaign = { id: 'dc-1', founder_id: 'user-1', business_key: 'dr', name: 'T', subject: 'S', body_html: '<p>', body_text: null, status: 'active', source: 'api', metadata: {}, created_at: '', updated_at: '' }

function client() {
  const b: Record<string, any> = {}
  for (const k of ['select', 'eq', 'order', 'lte', 'insert', 'update']) b[k] = vi.fn(() => b)
  b.single = vi.fn(async () => ({ data: campaign, error: null }))
  b.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
  return { from: vi.fn(() => b) }
}
const req = () => new Request('https://app.test/api/campaigns/drip', { method: 'POST', body: JSON.stringify({ action: 'process_pending', campaignId: 'dc-1', dryRun: false }) })

describe('POST /api/campaigns/drip process_pending: gate failures fail closed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(createClient).mockResolvedValue(client() as never)
  })
  it('returns 503 when suppression state is unknown or consent cannot be read', async () => {
    vi.mocked(processCampaignDrip).mockRejectedValue(new DripSendBlockedError('suppression state unknown'))
    const res = await POST(req())
    expect(res.status).toBe(503)
  })
  it('still returns 500 for an ordinary processing failure', async () => {
    vi.mocked(processCampaignDrip).mockRejectedValue(new Error('db down'))
    const res = await POST(req())
    expect(res.status).toBe(500)
  })
})
