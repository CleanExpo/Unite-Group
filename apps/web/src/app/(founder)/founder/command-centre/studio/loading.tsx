export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col bg-[var(--surface-canvas)] text-[var(--color-text-primary)]">
      <div className="flex-1 p-4">
        {/* Concept canvas placeholder — three concept tiles */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-sm border border-[var(--color-accent-border)] bg-[var(--surface-overlay)] animate-pulse"
            />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="h-3 w-2/3 rounded-sm bg-[var(--surface-overlay)] animate-pulse" />
          <div className="h-3 w-1/2 rounded-sm bg-[var(--surface-overlay)] animate-pulse" />
        </div>
      </div>

      {/* Docked composer placeholder */}
      <div className="flex items-center gap-2 border-t border-[var(--color-border)] p-3">
        <div className="h-9 w-24 rounded-sm bg-[var(--surface-overlay)] animate-pulse" />
        <div className="h-9 flex-1 rounded-sm bg-[var(--surface-overlay)] animate-pulse" />
        <div className="h-9 w-28 rounded-sm bg-[var(--color-accent-dim)] animate-pulse" />
      </div>
    </div>
  )
}
