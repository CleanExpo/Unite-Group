import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'
import { isValidCliAccount } from '../../../server/lanes/types'
import type { CreateLaneInput } from '../../../server/lanes/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCreateLaneInput(value: unknown): value is CreateLaneInput {
  if (!isRecord(value) || !isRecord(value.backend)) return false
  if (
    typeof value.role !== 'string' ||
    !value.role.trim() ||
    typeof value.repo !== 'string' ||
    !value.repo.trim()
  ) {
    return false
  }
  const backend = value.backend
  if (value.kind === 'cli') {
    return (
      backend.kind === 'cli' &&
      (backend.tool === 'claude-code' || backend.tool === 'codex') &&
      isValidCliAccount(backend.account)
    )
  }
  if (value.kind === 'gateway') {
    return (
      backend.kind === 'gateway' &&
      typeof backend.provider === 'string' &&
      !!backend.provider.trim() &&
      typeof backend.model === 'string' &&
      !!backend.model.trim()
    )
  }
  return false
}

export const Route = createFileRoute('/api/lanes/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body: unknown = await request.json()
          if (!isCreateLaneInput(body)) {
            return json(
              { ok: false, error: 'Invalid lane configuration' },
              { status: 400 },
            )
          }
          const lane = await getLaneOrchestrator().create(body)
          return json({ ok: true, lane })
        } catch {
          return json(
            { ok: false, error: 'Failed to create lane' },
            { status: 500 },
          )
        }
      },
    },
  },
})
