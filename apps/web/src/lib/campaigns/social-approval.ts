import { createHash } from 'node:crypto'

export interface SocialPublishSubject {
  id: string
  business_key: string
  content: string
  title?: string | null
  media_urls: string[] | null
  platforms: string[]
  scheduled_at?: string | null
}

export interface SocialApprovalRow {
  id: string
  status: string
  payload: unknown
}

export function fingerprintSocialPost(post: SocialPublishSubject): string {
  return createHash('sha256').update(JSON.stringify({
    id: post.id,
    businessKey: post.business_key,
    title: post.title ?? null,
    content: post.content,
    mediaUrls: [...(post.media_urls ?? [])].sort(),
    platforms: [...post.platforms].sort(),
    scheduledAt: post.scheduled_at ?? null,
  })).digest('hex')
}

export function findMatchingSocialApproval(
  rows: SocialApprovalRow[],
  postId: string,
  fingerprint: string,
  status: 'pending' | 'approved',
): SocialApprovalRow | null {
  return rows.find((row) => {
    if (row.status !== status || !row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) {
      return false
    }
    const payload = row.payload as Record<string, unknown>
    return payload.postId === postId && payload.fingerprint === fingerprint
  }) ?? null
}
