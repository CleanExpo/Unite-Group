export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-3">
      <div className="h-5 w-48 bg-white/6 rounded-sm animate-pulse" />
      <div className="h-10 w-full bg-white/6 rounded-sm animate-pulse" />
      <div className="h-40 w-full bg-white/6 rounded-sm animate-pulse" />
    </div>
  )
}
