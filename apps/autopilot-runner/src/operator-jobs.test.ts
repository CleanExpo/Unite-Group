import { describe, it, expect, vi } from 'vitest'
import {
  loadOperatorJobsConfig,
  canTransition,
  validateJobSafety,
  claimNextJob,
  runOperatorJobsOnce,
  type OperatorJob,
  type OperatorJobsConfig,
} from './operator-jobs.js'

const BASE_ENV = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
  FOUNDER_USER_ID: 'founder-uuid',
  CC_OPERATOR_JOBS_LIVE: '1',
} as NodeJS.ProcessEnv

function config(overrides: Partial<OperatorJobsConfig> = {}): OperatorJobsConfig {
  return {
    supabaseUrl: 'https://proj.supabase.co',
    serviceRoleKey: 'service-role-secret',
    founderId: 'founder-uuid',
    agentId: 'mac-studio',
    live: true,
    ...overrides,
  }
}

function job(overrides: Partial<OperatorJob> = {}): OperatorJob {
  return {
    id: 'job-1',
    founder_id: 'founder-uuid',
    lane_id: 'agentic_nexus_skill_exec',
    title: 'Run a diagnostic',
    task_type: 'diagnostic',
    status: 'queued',
    external_action_requested: false,
    production_action_requested: false,
    api_key_requested: false,
    ...overrides,
  }
}

// Routes a mock fetch by HTTP method + URL fragment.
function router(routes: Array<{ test: (url: string, method: string) => boolean; body: unknown; ok?: boolean; status?: number }>) {
  const calls: Array<{ url: string; method: string; body: unknown }> = []
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase()
    calls.push({ url, method, body: init.body ? JSON.parse(init.body as string) : undefined })
    const route = routes.find((r) => r.test(url, method))
    const body = route?.body ?? []
    return {
      ok: route?.ok ?? true,
      status: route?.status ?? 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response
  })
  return { fn: fn as unknown as typeof fetch, calls }
}

const deps = (fetchFn: typeof fetch) => ({ fetch: fetchFn, now: () => 0, machineFacts: () => 'node v24 · test' })

describe('loadOperatorJobsConfig', () => {
  it('loads valid config with the live kill switch on', () => {
    const r = loadOperatorJobsConfig(BASE_ENV)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.config.founderId).toBe('founder-uuid')
      expect(r.config.live).toBe(true)
    }
  })

  it('defaults live to false when CC_OPERATOR_JOBS_LIVE is unset', () => {
    const r = loadOperatorJobsConfig({ ...BASE_ENV, CC_OPERATOR_JOBS_LIVE: undefined } as NodeJS.ProcessEnv)
    expect(r.ok && r.config.live).toBe(false)
  })

  it('fails closed on missing required env', () => {
    const r = loadOperatorJobsConfig({} as NodeJS.ProcessEnv)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})

describe('canTransition', () => {
  it('allows queued→running→done but not queued→done or done→running', () => {
    expect(canTransition('queued', 'running')).toBe(true)
    expect(canTransition('running', 'done')).toBe(true)
    expect(canTransition('running', 'blocked')).toBe(true)
    expect(canTransition('queued', 'done')).toBe(false)
    expect(canTransition('done', 'running')).toBe(false)
  })
})

describe('validateJobSafety', () => {
  it('blocks hard-gated task types', () => {
    const r = validateJobSafety(job({ task_type: 'production_deploy' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('hard-gated')
  })

  it('blocks any escalation flag', () => {
    expect(validateJobSafety(job({ external_action_requested: true })).ok).toBe(false)
    expect(validateJobSafety(job({ production_action_requested: true })).ok).toBe(false)
    expect(validateJobSafety(job({ api_key_requested: true })).ok).toBe(false)
  })

  it('passes a safe diagnostic job', () => {
    expect(validateJobSafety(job()).ok).toBe(true)
  })
})

describe('claimNextJob', () => {
  it('selects, atomically claims, and logs a status_changed event', async () => {
    const { fn, calls } = router([
      { test: (u, m) => m === 'GET' && u.includes('/operator_jobs'), body: [job()] },
      { test: (u, m) => m === 'PATCH' && u.includes('status=in.(planned,queued)'), body: [job({ status: 'running' })] },
      { test: (u, m) => m === 'POST' && u.includes('/operator_events'), body: [] },
    ])
    const claimed = await claimNextJob(config(), deps(fn))
    expect(claimed?.status).toBe('running')
    const evt = calls.find((c) => c.method === 'POST' && c.url.includes('operator_events'))
    expect((evt?.body as any[])[0].event_type).toBe('status_changed')
    expect((evt?.body as any[])[0].to_status).toBe('running')
  })

  it('returns null when there are no pending jobs', async () => {
    const { fn } = router([{ test: (u, m) => m === 'GET', body: [] }])
    expect(await claimNextJob(config(), deps(fn))).toBeNull()
  })

  it('returns null when it loses the claim race (PATCH matches 0 rows)', async () => {
    const { fn } = router([
      { test: (u, m) => m === 'GET', body: [job()] },
      { test: (u, m) => m === 'PATCH', body: [] },
    ])
    expect(await claimNextJob(config(), deps(fn))).toBeNull()
  })
})

describe('runOperatorJobsOnce', () => {
  it('drains immediately when the kill switch is off', async () => {
    const { fn, calls } = router([])
    const out = await runOperatorJobsOnce(config({ live: false }), deps(fn))
    expect(out.outcome).toBe('drained')
    expect(calls).toHaveLength(0) // no DB touched
  })

  it('is idle when the queue is empty', async () => {
    const { fn } = router([{ test: (u, m) => m === 'GET', body: [] }])
    expect((await runOperatorJobsOnce(config(), deps(fn))).outcome).toBe('idle')
  })

  it('executes a diagnostic to done with an evidence event', async () => {
    const { fn, calls } = router([
      { test: (u, m) => m === 'GET' && u.includes('/operator_jobs'), body: [job()] },
      { test: (u, m) => m === 'PATCH' && u.includes('status=in.(planned,queued)'), body: [job({ status: 'running' })] },
      { test: (u, m) => m === 'POST', body: [] },
      { test: (u, m) => m === 'PATCH' && u.includes('id=eq.job-1') && !u.includes('status=in'), body: [] },
    ])
    const out = await runOperatorJobsOnce(config(), deps(fn))
    expect(out.outcome).toBe('done')
    if (out.outcome === 'done') expect(out.summary).toContain('diagnostic ok')
    const events = calls.filter((c) => c.method === 'POST').map((c) => (c.body as any[])[0].event_type)
    expect(events).toContain('evidence_added')
    expect(events).toContain('status_changed')
    // final transition PATCH sets done
    const finalPatch = calls.reverse().find((c) => c.method === 'PATCH' && !c.url.includes('status=in'))
    expect((finalPatch?.body as any).status).toBe('done')
  })

  it('blocks a hard-gated job with a gate_blocked event, never executing it', async () => {
    const hard = job({ task_type: 'production_deploy' })
    const { fn, calls } = router([
      { test: (u, m) => m === 'GET', body: [hard] },
      { test: (u, m) => m === 'PATCH' && u.includes('status=in.(planned,queued)'), body: [{ ...hard, status: 'running' }] },
      { test: (u, m) => m === 'POST', body: [] },
      { test: (u, m) => m === 'PATCH', body: [] },
    ])
    const out = await runOperatorJobsOnce(config(), deps(fn))
    expect(out.outcome).toBe('blocked')
    const events = calls.filter((c) => c.method === 'POST').map((c) => (c.body as any[])[0].event_type)
    expect(events).toContain('gate_blocked')
    expect(events).not.toContain('evidence_added') // no execution happened
  })

  it('blocks a safe-but-unsupported task type (no Tier 2 executor) without executing', async () => {
    const code = job({ task_type: 'feature_implementation' })
    const { fn, calls } = router([
      { test: (u, m) => m === 'GET', body: [code] },
      { test: (u, m) => m === 'PATCH' && u.includes('status=in.(planned,queued)'), body: [{ ...code, status: 'running' }] },
      { test: (u, m) => m === 'POST', body: [] },
      { test: (u, m) => m === 'PATCH', body: [] },
    ])
    const out = await runOperatorJobsOnce(config(), deps(fn))
    expect(out.outcome).toBe('blocked')
    if (out.outcome === 'blocked') expect(out.reason).toContain('no executor')
    const events = calls.filter((c) => c.method === 'POST').map((c) => (c.body as any[])[0].event_type)
    expect(events).not.toContain('evidence_added')
  })
})
