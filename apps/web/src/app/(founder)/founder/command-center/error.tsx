'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={{ background: '#050505', color: '#f4fbfc' }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: '#00f5ff' }}>
        Command Center error
      </p>
      <p className="max-w-md text-sm" style={{ color: 'rgba(244,251,252,0.62)' }}>
        The command center failed to render. This view degrades to seed data when the API is
        unreachable, so a hard error here usually means a client-side fault.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] rounded-sm"
        style={{ borderColor: 'rgba(0,245,255,0.14)', color: '#f4fbfc', background: '#0a0a0c' }}
      >
        Retry
      </button>
    </div>
  )
}
