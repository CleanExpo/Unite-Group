export default function EngagementLoading() {
  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="h-6 w-72 rounded-sm animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
      <div className="mt-3 h-4 w-40 rounded-sm animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
      <div className="mt-4 h-12 rounded-sm animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
      <div className="mt-8 flex flex-col gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-sm animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        ))}
      </div>
    </div>
  )
}
