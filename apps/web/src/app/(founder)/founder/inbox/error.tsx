'use client'

import { RouteErrorBoundary } from '@/founder/RouteErrorBoundary'

export default function InboxError({
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
      section="inbox"
      title="Inbox unavailable"
      description="The inbox failed to load. Please try again."
    />
  )
}
