'use client'

import { RouteErrorBoundary } from '@/components/founder/RouteErrorBoundary'

export default function KnowledgeConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      section="knowledge-console"
      title="Knowledge Console unavailable"
      description="The read-only knowledge shell failed to load. No vault data was accessed."
    />
  )
}

