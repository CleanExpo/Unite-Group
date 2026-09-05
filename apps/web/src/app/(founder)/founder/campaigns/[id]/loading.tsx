import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'

export default function Loading() {
  return (
    <MissionControlShell section="campaigns" title="Campaign">
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
      </div>
      <div className="bg-[var(--mission-surface)] border border-[var(--mission-border)] rounded-sm p-4 flex flex-col gap-3">
        <div className="h-3 w-2/3 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-2 w-full bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-2 w-5/6 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
        <div className="h-2 w-3/4 bg-[var(--mission-raised)] rounded-sm animate-pulse" />
      </div>
    </div></MissionControlShell>
  )
}
