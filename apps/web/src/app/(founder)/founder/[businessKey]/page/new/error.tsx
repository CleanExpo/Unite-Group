'use client'

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
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-[13px] text-[#52525b]">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="border border-white/[0.12] text-[#52525b] text-[13px] rounded-sm px-4 py-2 hover:border-white/20 hover:text-[#3f3f46] transition-colors disabled:opacity-40"
      >
        Try again
      </button>
    </div>
  )
}
