import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'

export default function Loading() {
  return (
    <MissionControlShell section="campaigns" title="Campaigns">
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-[var(--mission-surface)] border border-[var(--mission-border)] rounded-sm p-4 flex flex-col gap-3">
            <div className="h-3 w-2/3 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
            <div className="h-2 w-full bg-[var(--mission-raised)] rounded-sm animate-pulse" />
            <div className="h-2 w-4/5 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
            <div className="flex gap-2 mt-2">
              <div className="h-4 w-16 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
              <div className="h-4 w-20 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div></MissionControlShell>
  )
}
