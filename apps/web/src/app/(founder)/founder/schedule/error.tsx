'use client'

import { RouteErrorBoundary } from '@/components/founder/RouteErrorBoundary'

export default function ScheduleError({
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
      section="schedule"
      title="Schedule unavailable"
      description="The scheduled jobs viewer failed to load. Please try again."
    />
  )
}
