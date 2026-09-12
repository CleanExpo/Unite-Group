'use client'
import { MissionControlShell } from '../../command-centre/MissionControlShell'
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <MissionControlShell section="weekly-tasks" title="Weekly review unavailable"><p role="alert">The review page could not be loaded. No decision has been recorded.</p><button type="button" onClick={reset}>Retry page</button></MissionControlShell>
}
