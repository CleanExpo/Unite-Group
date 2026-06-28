'use client'

import { RouteErrorBoundary } from '@/components/founder/RouteErrorBoundary'

export default function OpportunitiesError({
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
      section="opportunities"
      title="Revenue register unavailable"
      description="The opportunity pipeline failed to load. Please try again."
    />
  )
}
