export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-white/6 rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-white/6 rounded-sm animate-pulse" />
      </div>
      <div className="bg-[#fff7ec] border border-white/6 rounded-sm p-4 flex flex-col gap-3">
        <div className="h-3 w-2/3 bg-white/6 rounded-sm animate-pulse" />
        <div className="h-2 w-full bg-white/6 rounded-sm animate-pulse" />
        <div className="h-2 w-5/6 bg-white/6 rounded-sm animate-pulse" />
        <div className="h-2 w-3/4 bg-white/6 rounded-sm animate-pulse" />
      </div>
    </div>
  )
}
