'use client'

import { useEffect } from 'react'

export default function CoachingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[coaching] segment error', error)
  }, [error])

  return (
    <div className="px-8 py-6 max-w-2xl">
      <h2 className="text-[16px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Coaching Clinic failed to load
      </h2>
      <p className="mt-2 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        {error.message || 'An unexpected error occurred.'}
        {error.digest ? ` (${error.digest})` : ''}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-sm border px-3 h-8 text-[13px] transition-colors duration-100"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      >
        Try again
      </button>
    </div>
  )
}
