import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import {
  BEARER_TOKEN,
  CLAUDE_API,
} from '../../../server/gateway-capabilities'
import { listBackends } from '../../../server/lanes/backend-registry'
import {
  backendUnavailableReason,
  cliAccountSource,
  makeAvailabilityCheck,
  probeGatewayModels,
} from '../../../server/lanes/lane-availability'

export const Route = createFileRoute('/api/lanes/backends')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        // Provider-specific availability comes from the authenticated model
        // catalogue; a merely healthy gateway is not proof that a provider is usable.
        const gatewayModels = await probeGatewayModels(
          CLAUDE_API,
          BEARER_TOKEN,
        )
        const gatewayProviders = new Set(
          gatewayModels.map((model) => model.provider),
        )
        const backends = listBackends(
          makeAvailabilityCheck(gatewayProviders),
          gatewayModels,
        ).map((b) => ({
          ...b,
          ...(b.id.startsWith('cli:claude-code:')
            ? { source: cliAccountSource(b.id.split(':').pop() ?? '') }
            : {}),
          ...(b.available
            ? {}
            : { unavailableReason: backendUnavailableReason(b.backend) }),
        }))
        return json({
          ok: true,
          backends,
          gatewayUp: gatewayProviders.size > 0,
        })
      },
    },
  },
})
