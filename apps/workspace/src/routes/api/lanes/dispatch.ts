import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getNexusDispatcher, getNexusWorkers } from '../../../server/lanes'
import type { NexusWorkerId } from '../../../server/lanes/worker-registry'

function requestedWorkerId(value: unknown): NexusWorkerId | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const workerId = (value as Record<string, unknown>).workerId
  return typeof workerId === 'string' ? (workerId as NexusWorkerId) : null
}

export const Route = createFileRoute('/api/lanes/dispatch')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const workerId = requestedWorkerId(await request.json())
          const workers = await getNexusWorkers()
          const worker = workers.find((candidate) => candidate.id === workerId)
          if (!worker) {
            return json(
              { ok: false, error: 'A valid workerId is required' },
              { status: 400 },
            )
          }
          if (!worker.enabled) {
            return json(
              {
                ok: false,
                error: worker.reason ?? 'Worker is not admitted',
              },
              { status: 409 },
            )
          }
          const result = await getNexusDispatcher().dispatchNext(worker.id)
          return json({ ok: true, ...result })
        } catch {
          return json(
            { ok: false, error: 'Failed to dispatch Nexus task' },
            { status: 500 },
          )
        }
      },
    },
  },
})
