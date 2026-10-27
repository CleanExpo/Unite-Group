'use client'

import { RouteErrorBoundary } from '@/founder/RouteErrorBoundary'

export default function SiteAgentError({
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
      section="site-agent"
      title="Site agent unavailable"
      description="The site-agent console failed to load."
    />
  )
}
