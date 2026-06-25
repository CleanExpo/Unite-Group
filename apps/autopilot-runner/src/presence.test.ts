import { describe, it, expect, vi } from 'vitest'
import {
  loadPresenceConfig,
  buildPresenceRow,
  sendHeartbeat,
  startHeartbeat,
  type PresenceConfig,
} from './presence.js'

const BASE_ENV = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
  FOUNDER_USER_ID: 'founder-uuid',
} as NodeJS.ProcessEnv

function config(overrides: Partial<PresenceConfig> = {}): PresenceConfig {
  return {
    supabaseUrl: 'https://proj.supabase.co',
    serviceRoleKey: 'service-role-secret',
    founderId: 'founder-uuid',
    agentId: 'mac-studio',
    hostname: 'mac-studio',
    agentVersion: 'autopilot-runner@0.0.1',
    capabilities: { source: 'autopilot-runner' },
    startedAtIso: '2026-06-26T05:00:00.000Z',
    intervalMs: 15_000,
    ...overrides,
  }
}

describe('loadPresenceConfig', () => {
  it('loads a valid config and strips a trailing slash from the url', () => {
    const r = loadPresenceConfig({ ...BASE_ENV, SUPABASE_URL: 'https://proj.supabase.co/' }, '2026-06-26T06:00:00.000Z')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.config.supabaseUrl).toBe('https://proj.supabase.co')
    expect(r.config.founderId).toBe('founder-uuid')
    expect(r.config.startedAtIso).toBe('2026-06-26T06:00:00.000Z')
    expect(r.config.intervalMs).toBe(15_000)
  })

  it('falls back to NEXT_PUBLIC_SUPABASE_URL', () => {
    const r = loadPresenceConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://pub.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      FOUNDER_USER_ID: 'f',
    } as NodeJS.ProcessEnv)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.config.supabaseUrl).toBe('https://pub.supabase.co')
  })

  it('fails closed listing every missing required var', () => {
    const r = loadPresenceConfig({} as NodeJS.ProcessEnv)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('SUPABASE_URL')
    expect(r.error).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(r.error).toContain('FOUNDER_USER_ID')
  })

  it('parses capabilities JSON and ignores malformed values', () => {
    const good = loadPresenceConfig({ ...BASE_ENV, HERMES_AGENT_CAPABILITIES: '{"lanes":["hermes_local"]}' })
    expect(good.ok && good.config.capabilities).toEqual({ lanes: ['hermes_local'] })
    const bad = loadPresenceConfig({ ...BASE_ENV, HERMES_AGENT_CAPABILITIES: 'not json' })
    expect(bad.ok && bad.config.capabilities).toEqual({ source: 'autopilot-runner' })
  })

  it('rejects an interval below the 1s floor and uses the default', () => {
    const r = loadPresenceConfig({ ...BASE_ENV, HERMES_HEARTBEAT_INTERVAL_MS: '50' })
    expect(r.ok && r.config.intervalMs).toBe(15_000)
  })
})

describe('buildPresenceRow', () => {
  it('maps config to the table row with the heartbeat moment', () => {
    const row = buildPresenceRow(config(), '2026-06-26T06:00:30.000Z')
    expect(row).toEqual({
      founder_id: 'founder-uuid',
      agent_id: 'mac-studio',
      hostname: 'mac-studio',
      agent_version: 'autopilot-runner@0.0.1',
      capabilities: { source: 'autopilot-runner' },
      started_at: '2026-06-26T05:00:00.000Z',
      last_seen_at: '2026-06-26T06:00:30.000Z',
    })
  })
})

describe('sendHeartbeat', () => {
  it('POSTs an upsert with service-role auth and merge-duplicates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
    const now = () => Date.parse('2026-06-26T06:00:00.000Z')
    const res = await sendHeartbeat(config(), { fetch: fetchMock as unknown as typeof fetch, now })

    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://proj.supabase.co/rest/v1/operator_agent_presence?on_conflict=founder_id,agent_id')
    expect(init.method).toBe('POST')
    expect(init.headers.apikey).toBe('service-role-secret')
    expect(init.headers.Authorization).toBe('Bearer service-role-secret')
    expect(init.headers.Prefer).toContain('resolution=merge-duplicates')
    const body = JSON.parse(init.body)
    expect(body).toHaveLength(1)
    expect(body[0].founder_id).toBe('founder-uuid')
    expect(body[0].last_seen_at).toBe('2026-06-26T06:00:00.000Z')
  })

  it('returns an error (never throws) on a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'no auth' })
    const res = await sendHeartbeat(config(), { fetch: fetchMock as unknown as typeof fetch, now: () => 0 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('401')
  })

  it('returns an error (never throws) when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await sendHeartbeat(config(), { fetch: fetchMock as unknown as typeof fetch, now: () => 0 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('ECONNREFUSED')
  })
})

describe('startHeartbeat', () => {
  it('beats once immediately and can be stopped', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
    const loop = startHeartbeat(config(), { fetch: fetchMock as unknown as typeof fetch, now: () => 0 })
    // allow the immediate microtask beat to run
    await Promise.resolve()
    await Promise.resolve()
    loop.stop()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps beating on the interval until stopped', async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
      const loop = startHeartbeat(config({ intervalMs: 1000 }), { fetch: fetchMock as unknown as typeof fetch, now: () => 0 })
      await vi.advanceTimersByTimeAsync(0) // immediate beat
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(3000) // three more intervals
      expect(fetchMock).toHaveBeenCalledTimes(4)
      loop.stop()
      await vi.advanceTimersByTimeAsync(5000) // no beats after stop
      expect(fetchMock).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })

  // Regression: the standalone daemon must NOT unref its timer, or the process
  // exits after the first beat's I/O resolves and the panel goes stale/offline.
  it('does not unref the interval by default (daemon stays alive)', () => {
    const unref = vi.fn()
    const spy = vi.spyOn(global, 'setInterval').mockReturnValue({ unref } as unknown as ReturnType<typeof setInterval>)
    try {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
      const loop = startHeartbeat(config(), { fetch: fetchMock as unknown as typeof fetch, now: () => 0 })
      expect(unref).not.toHaveBeenCalled()
      loop.stop()
    } finally {
      spy.mockRestore()
    }
  })

  it('unrefs the interval when keepProcessAlive is false (embedded use)', () => {
    const unref = vi.fn()
    const spy = vi.spyOn(global, 'setInterval').mockReturnValue({ unref } as unknown as ReturnType<typeof setInterval>)
    try {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
      const loop = startHeartbeat(
        config(),
        { fetch: fetchMock as unknown as typeof fetch, now: () => 0 },
        undefined,
        { keepProcessAlive: false },
      )
      expect(unref).toHaveBeenCalledTimes(1)
      loop.stop()
    } finally {
      spy.mockRestore()
    }
  })
})
