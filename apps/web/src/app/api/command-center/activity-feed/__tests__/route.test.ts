import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(async () => ({ from: vi.fn() })),
}))

vi.mock('@/lib/command-centre/tasks', () => ({
  listTasks: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { GET } from '../route'

function makeTask(overrides: Partial<CommandCentreTask> = {}): CommandCentreTask {
  return {
    id: 'task-1',
    founder_id: 'user-123',
    external_ref: null,
    queue_id: null,
    project_id: null,
    project_key: 'unite-group',
    title: 'Build the activity feed',
    objective: 'Build the activity feed',
    priority: 'P2',
    status: 'running',
    agent_owner: 'Hermes',
    risk_level: 'low',
    execution_mode: 'advisory',
    origin: 'idea',
    dependencies: [],
    human_approval_required: false,
    evidence_path: null,
    validation_required: [],
    linear_id: 'UNI-2137',
    preview_url: null,
    metadata: {},
    created_at: '2026-06-16T01:00:00.000Z',
    updated_at: '2026-06-16T02:00:00.000Z',
    ...overrides,
  }
}

// No secret value should ever surface in a response body.
const FORBIDDEN_IN_BODY: readonly string[] = [
  'service_role',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAULT_ENCRYPTION_KEY',
  'ANTHROPIC_API_KEY',
  'CRON_SECRET',
  'password',
  'secret',
]

function assertNoSecrets(json: unknown): void {
  const serialised = JSON.stringify(json).toLowerCase()
  for (const token of FORBIDDEN_IN_BODY) {
    expect(serialised).not.toContain(token.toLowerCase())
  }
}

describe('GET /api/command-center/activity-feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await GET()
    expect(res.status).toBe(401)
    expect(listTasks).not.toHaveBeenCalled()
  })

  it('returns 200 with the derived activity-feed shape', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(listTasks).mockResolvedValue([makeTask()])

    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')

    const json = (await res.json()) as {
      source: string
      events: Array<{ id: string; agent: string; verb: string; origin: string; url?: string }>
      sourceLiveAt: string | null
    }
    expect(json.source).toBe('cc:activity')
    expect(json.events).toHaveLength(1)
    expect(json.events[0].agent).toBe('Hermes')
    expect(json.events[0].origin).toBe('linear')
    expect(json.sourceLiveAt).not.toBeNull()

    // Founder-scoped read, capped at 100.
    expect(listTasks).toHaveBeenCalledWith({ founderId: 'user-123', limit: 100 })

    assertNoSecrets(json)
  })

  it('returns an honest empty feed (sourceLiveAt null) when there are no tasks', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(listTasks).mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(200)

    const json = (await res.json()) as { events: unknown[]; sourceLiveAt: string | null }
    expect(json.events).toHaveLength(0)
    expect(json.sourceLiveAt).toBeNull()
  })

  it('returns 503 when listTasks throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(listTasks).mockRejectedValue(new Error('db down'))

    const res = await GET()
    expect(res.status).toBe(503)

    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('cc_activity_unavailable')
  })
})
