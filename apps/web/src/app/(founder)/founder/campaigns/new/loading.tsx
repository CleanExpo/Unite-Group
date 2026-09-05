import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'

export default function Loading() {
  return (
    <MissionControlShell section="campaigns" title="New Campaign">
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
      </div>
      <div className="bg-[var(--mission-surface)] border border-[var(--mission-border)] rounded-sm p-4 flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2 w-24 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
            <div className="h-8 w-full bg-[var(--mission-raised)] rounded-sm animate-pulse" />
          </div>
        ))}
        <div className="h-8 w-32 bg-[var(--mission-raised)] rounded-sm animate-pulse mt-2" />
      </div>
    </div></MissionControlShell>
  )
}
