export default function Loading() {
  return (
    <div className="flex min-h-full flex-col gap-5 p-4 md:p-6">
      <div className="space-y-2">
        <div className="h-5 w-56 animate-pulse rounded-sm bg-white/[0.06]" />
        <div className="h-3 w-96 max-w-full animate-pulse rounded-sm bg-white/[0.06]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        {[0, 1, 2].map((column) => (
          <div
            key={column}
            className="min-h-[420px] rounded-sm border p-4"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-3 animate-pulse rounded-sm bg-white/[0.06]"
                  style={{ width: `${90 - row * 10}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

