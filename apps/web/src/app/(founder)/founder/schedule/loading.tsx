export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-white/6 rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-white/6 rounded-sm animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="border border-white/6 rounded-sm px-4 py-3 flex items-center gap-4"
          >
            <div className="h-3 w-1/4 bg-white/6 rounded-sm animate-pulse" />
            <div className="h-3 w-1/5 bg-white/6 rounded-sm animate-pulse" />
            <div className="h-3 w-1/3 bg-white/6 rounded-sm animate-pulse" />
            <div className="h-3 w-16 bg-white/6 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
