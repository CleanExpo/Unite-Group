import { MissionControlShell } from '../MissionControlShell'
import { StudioClient } from './StudioClient'

export function StudioView({ taskId, className }: { taskId?: string; className?: string }) {
  return (
    <MissionControlShell section="studio" title="Studio" className={className}>
      {taskId ? <StudioClient taskId={taskId} /> : (
        <p>Open the studio from a routed idea — a <code>taskId</code> is required.</p>
      )}
    </MissionControlShell>
  )
}
