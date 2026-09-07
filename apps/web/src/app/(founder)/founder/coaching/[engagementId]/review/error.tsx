'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[coaching/review] segment error', error)
  }, [error])

  return (
    <div className="px-8 py-6 max-w-2xl">
      <h2 className="text-[16px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        The review queue failed to load
      </h2>
      <p className="mt-2 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        {error.message || 'An unexpected error occurred.'}
        {error.digest ? ` (${error.digest})` : ''}
      </p>
      <p className="mt-2 text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>
        Nothing has been approved or rejected — the queue is unchanged.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={reset}
          className="rounded-sm border px-3 h-8 text-[13px] transition-colors duration-100"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          Try again
        </button>
        <Link
          href="/founder/coaching"
          className="rounded-sm border px-3 h-8 inline-flex items-center text-[13px] transition-colors duration-100"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          All clients
        </Link>
      </div>
    </div>
  )
}
