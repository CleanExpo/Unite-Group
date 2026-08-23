import { describe, expect, it } from 'vitest'
import { findMatchingSocialApproval, fingerprintSocialPost } from '../social-approval'

const post = {
  id: 'post-1', business_key: 'ccw', title: null, content: 'Test post',
  media_urls: ['https://example.com/a.png'], platforms: ['facebook'], scheduled_at: null,
}

describe('external social publishing approval', () => {
  it('matches only the approved exact version', () => {
    const fingerprint = fingerprintSocialPost(post)
    const rows = [{ id: 'approval-1', status: 'approved', payload: { postId: post.id, fingerprint } }]

    expect(findMatchingSocialApproval(rows, post.id, fingerprint, 'approved')?.id).toBe('approval-1')
    expect(findMatchingSocialApproval(rows, post.id, fingerprintSocialPost({ ...post, content: 'changed' }), 'approved')).toBeNull()
  })

  it('includes the business identity so approval cannot cross brands', () => {
    expect(fingerprintSocialPost(post)).not.toBe(fingerprintSocialPost({ ...post, business_key: 'carsi' }))
  })
})
