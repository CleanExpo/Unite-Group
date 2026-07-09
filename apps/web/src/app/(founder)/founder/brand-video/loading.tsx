export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-white/6 rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-white/6 rounded-sm animate-pulse" />
      </div>
      <div className="bg-[#fff7ec] border border-white/6 rounded-sm p-4 flex flex-col gap-4">
        <div className="h-2 w-32 bg-white/6 rounded-sm animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-white/3 rounded-sm animate-pulse" />
          ))}
        </div>
        <div className="h-9 w-40 bg-white/6 rounded-sm animate-pulse" />
      </div>
      <div className="bg-[#fff7ec] border border-white/6 rounded-sm p-4">
        <div className="h-2 w-32 bg-white/6 rounded-sm animate-pulse mb-4" />
        <div className="h-[240px] bg-white/3 rounded-sm animate-pulse" />
      </div>
    </div>
  )
}
