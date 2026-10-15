export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-white/6 rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-white/6 rounded-sm animate-pulse" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 bg-white/6 rounded-sm animate-pulse" />
      ))}
    </div>
  )
}
