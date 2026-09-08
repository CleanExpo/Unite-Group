'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { ReviewQueue, type ReviewItem } from './ReviewQueue'
import type { ReviewAction } from '@/lib/coaching/review'

/**
 * Wires ReviewQueue to the API. Kept separate so ReviewQueue itself stays
 * transport-free and can be rendered without a database or a network.
 */
export function ReviewQueueClient({ items }: { items: ReviewItem[] }) {
  const router = useRouter()

  const onDecide = useCallback(
    async (id: string, action: ReviewAction, body: string) => {
      const res = await fetch(`/api/coaching/extractions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, body }),
      })

      // proxy.ts redirects an unauthenticated request to /auth/login rather than
      // returning 401, and fetch follows it — so res.ok is true and the body is
      // HTML. Check the redirect before trusting the status.
      if (res.redirected && new URL(res.url).pathname.startsWith('/auth/login')) {
        throw new Error('Session expired — sign in again')
      }
      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        throw new Error(
          detail?.error === 'not_reviewable'
            ? 'Already decided — reload the page'
            : `Could not save (${res.status})`,
        )
      }

      // Refresh so the count on the client file and this queue stay honest.
      router.refresh()
    },
    [router],
  )

  return <ReviewQueue items={items} onDecide={onDecide} />
}
