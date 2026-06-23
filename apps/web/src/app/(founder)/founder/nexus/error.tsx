'use client'

import { RouteErrorBoundary } from '@/components/founder/RouteErrorBoundary'

export default function NexusError({
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
      section="nexus"
      title="Nexus unavailable"
      description="The Nexus PR approvals dashboard failed to load. This may be a temporary issue."
    />
  )
}
