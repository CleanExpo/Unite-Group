'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <div className="rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        Something went wrong loading your board.
        <button type="button" onClick={reset} className="ml-2 underline">
          Retry
        </button>
      </div>
    </div>
  )
}
