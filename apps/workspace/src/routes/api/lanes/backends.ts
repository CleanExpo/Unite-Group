import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  BEARER_TOKEN,
  CLAUDE_API,
} from '../../../server/gateway-capabilities'
import { listBackends } from '../../../server/lanes/backend-registry'
import {
  cliAccountSource,
  makeAvailabilityCheck,
  probeGatewayProviders,
} from '../../../server/lanes/lane-availability'

export const Route = createFileRoute('/api/lanes/backends')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        // Provider-specific availability comes from the authenticated model
        // catalogue; a merely healthy gateway is not proof that a provider is usable.
        const gatewayProviders = await probeGatewayProviders(
          CLAUDE_API,
          BEARER_TOKEN,
        )
        const backends = listBackends(
          makeAvailabilityCheck(gatewayProviders),
        ).map(
          (b) =>
            b.id.startsWith('cli:claude-code:')
              ? { ...b, source: cliAccountSource(b.id.split(':').pop() ?? '') }
              : b,
        )
        return json({
          ok: true,
          backends,
          gatewayUp: gatewayProviders.size > 0,
        })
      },
    },
  },
})
