import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { readRuntimeControlPlane } from '../../server/runtime-control-plane'

/**
 * Read-only receipt endpoint for the Command Centre.
 *
 * The returned state is assembled exclusively from runtime checkpoints. It
 * cannot enqueue work, trigger a handoff, or change a runner configuration.
 */
export const Route = createFileRoute('/api/runtime-control-plane')({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        return json(readRuntimeControlPlane())
      },
    },
  },
})
