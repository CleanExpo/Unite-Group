'use client'
import { MissionControlShell } from '../../command-centre/MissionControlShell'
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <MissionControlShell section="weekly-tasks" title="Weekly review unavailable"><p role="alert">The review page could not be loaded. Your saved review status could not be confirmed. Reload before deciding again.</p><button type="button" onClick={reset}>Retry page</button></MissionControlShell>
}
