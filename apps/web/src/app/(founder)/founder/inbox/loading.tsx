export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-3" aria-busy="true">
      <div className="h-5 w-32 bg-white/6 rounded-sm animate-pulse" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 w-full max-w-3xl bg-white/6 rounded-sm animate-pulse" />
      ))}
    </div>
  )
}
