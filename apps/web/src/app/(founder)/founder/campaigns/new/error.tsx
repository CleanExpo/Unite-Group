'use client'

import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <MissionControlShell section="campaigns" title="New Campaign">
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-[13px] text-[var(--mission-muted)]">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="border border-[var(--mission-border)] text-[var(--mission-muted)] text-[13px] rounded-sm px-4 py-2 hover:border-[var(--mission-blue)] hover:text-[var(--mission-ink)] transition-colors disabled:opacity-40"
      >
        Try again
      </button>
    </div></MissionControlShell>
  )
}
