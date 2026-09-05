'use client'

import { MissionControlBoundary } from '../MissionControlBoundary'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <MissionControlBoundary section="wiki-graph" error={error} reset={reset} />
}
