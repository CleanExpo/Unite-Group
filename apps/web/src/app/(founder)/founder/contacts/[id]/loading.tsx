export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="h-3 w-24 bg-white/[0.06] rounded-sm animate-pulse" />
      <div className="h-5 w-48 bg-white/[0.06] rounded-sm animate-pulse" />
      <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-sm p-4 flex flex-col gap-3">
        <div className="h-2 w-2/3 bg-white/[0.06] rounded-sm animate-pulse" />
        <div className="h-2 w-1/2 bg-white/[0.06] rounded-sm animate-pulse" />
        <div className="h-2 w-3/4 bg-white/[0.06] rounded-sm animate-pulse" />
      </div>
    </div>
  )
}
