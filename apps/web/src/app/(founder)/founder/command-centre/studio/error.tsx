'use client'

import { RouteErrorBoundary } from '@/components/founder/RouteErrorBoundary'

export default function StudioError({
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
      section="command-centre-studio"
      title="Studio unavailable"
      description="The Visual Campaign Studio failed to load. This may be a temporary issue."
    />
  )
}
