export default function CoachingLoading() {
  return (
    <div className="px-8 py-6 max-w-4xl">
      <div
        className="h-6 w-48 rounded-sm animate-pulse"
        style={{ background: 'var(--surface-elevated)' }}
      />
      <div
        className="mt-2 h-4 w-80 rounded-sm animate-pulse"
        style={{ background: 'var(--surface-elevated)' }}
      />
      <div className="mt-6 flex flex-col gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-12 rounded-sm animate-pulse"
            style={{ background: 'var(--surface-elevated)' }}
          />
        ))}
      </div>
    </div>
  )
}
