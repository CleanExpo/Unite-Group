import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'

export default function Loading() {
  return (
    <MissionControlShell section="finance" title="Bookkeeper">
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--mission-surface)] border border-[var(--mission-border)] rounded-sm p-4 flex flex-col gap-3">
            <div className="h-2 w-1/2 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
            <div className="h-7 w-2/3 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-[var(--mission-surface)] border border-[var(--mission-border)] rounded-sm p-4">
        <div className="h-2 w-32 bg-[var(--mission-raised)] rounded-sm animate-pulse mb-4" />
        <div className="h-[280px] bg-[var(--mission-raised)] rounded-sm animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-[var(--mission-surface)] border border-[var(--mission-border)] rounded-sm p-4">
            <div className="h-2 w-32 bg-[var(--mission-raised)] rounded-sm animate-pulse mb-4" />
            <div className="h-[180px] bg-[var(--mission-raised)] rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div></MissionControlShell>
  )
}
