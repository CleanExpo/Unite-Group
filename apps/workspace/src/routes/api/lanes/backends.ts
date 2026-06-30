import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { CLAUDE_API } from '../../../server/gateway-capabilities'
import { listBackends } from '../../../server/lanes/backend-registry'
import {
  cliAccountSource,
  makeAvailabilityCheck,
  probeGateway,
} from '../../../server/lanes/lane-availability'

export const Route = createFileRoute('/api/lanes/backends')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        // Real availability (spec R9): gateway providers reflect a live /health
        // probe; CLI accounts reflect a dedicated login OR a shared Max token.
        // No more always-available stub that failed at lane creation.
        const gatewayUp = await probeGateway(CLAUDE_API)
        const backends = listBackends(makeAvailabilityCheck(gatewayUp)).map(
          (b) =>
            b.id.startsWith('cli:claude-code:')
              ? { ...b, source: cliAccountSource(b.id.split(':').pop() ?? '') }
              : b,
        )
        return json({ ok: true, backends, gatewayUp })
      },
    },
  },
})
