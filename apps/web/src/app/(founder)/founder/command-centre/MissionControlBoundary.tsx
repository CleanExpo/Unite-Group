'use client'

import type { MissionControlSection } from '@/lib/navigation/mission-control'
import { MissionControlShell } from './MissionControlShell'

export function MissionControlBoundary({ section, error, reset }: {
  section: MissionControlSection
  error?: Error & { digest?: string }
  reset?: () => void
}) {
  return (
    <MissionControlShell section={section}>
      {error ? (
        <section role="alert">
          <h1>This workspace could not load</h1>
          <p>{error.message}</p>
          <button type="button" onClick={reset}>Try again</button>
        </section>
      ) : <p role="status" aria-busy="true">Loading workspace…</p>}
    </MissionControlShell>
  )
}
