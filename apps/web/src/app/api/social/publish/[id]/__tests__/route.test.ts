import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/social/channels', () => ({ decodeToken: vi.fn(() => 'tok') }))
vi.mock('@/lib/integrations/social/publisher', () => ({ publishToPlatform: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { makeServiceChain, everyUpdateFounderScoped } from '@/test/founder-scope-chain'
import { fingerprintSocialPost } from '@/lib/campaigns/social-approval'
import { POST } from '../route'

const post = {
  id: 'post-1', status: 'draft', platforms: ['facebook'], business_key: 'ccw',
  title: null, content: 'Approved CCW post', media_urls: [], scheduled_at: null,
  platform_post_ids: {},
}

describe('POST /api/social/publish/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('founder-scopes both social_posts UPDATE chains (publishing + final status)', async () => {
    const chain = makeServiceChain([
      { data: post, error: null },
      { data: [{ id: 'approval-1', status: 'approved', payload: { postId: post.id, fingerprint: fingerprintSocialPost(post) } }], error: null },
      // single connected platform, no channel found => fast finish
      { data: null, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/publish', { method: 'POST' }),
      { params: Promise.resolve({ id: 'post-1' }) }
    )

    expect(res.status).toBe(200)
    expect(everyUpdateFounderScoped(chain, 'user-123')).toBe(true)
  })

  it('creates an approval request and does not contact a platform when unapproved', async () => {
    const chain = makeServiceChain([
      { data: post, error: null },
      { data: [], error: null },
      { data: { id: 'approval-1' }, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/publish', { method: 'POST' }),
      { params: Promise.resolve({ id: 'post-1' }) }
    )
    const body = await res.json() as { status?: string }

    expect(res.status).toBe(202)
    expect(body.status).toBe('awaiting_approval')
    expect(chain.from).not.toHaveBeenCalledWith('social_channels')
  })
})
