export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-white/[0.06] rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-white/[0.06] rounded-sm animate-pulse" />
      </div>
      <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-sm p-4 flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2 w-24 bg-white/[0.06] rounded-sm animate-pulse" />
            <div className="h-8 w-full bg-white/[0.06] rounded-sm animate-pulse" />
          </div>
        ))}
        <div className="h-8 w-32 bg-white/[0.06] rounded-sm animate-pulse mt-2" />
      </div>
    </div>
  )
}
