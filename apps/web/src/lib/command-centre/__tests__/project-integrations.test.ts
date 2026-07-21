import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  loadProjectIntegrationStatus,
  loadProjectIntegrationStatuses,
} from '@/lib/command-centre/project-integrations'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('project integration manifests', () => {
  it('skips projects without an integration status URL', async () => {
    await expect(loadProjectIntegrationStatus({ name: 'Synthex', integration_status_url: null })).resolves.toBeNull()
  })

  it('normalises a metadata-only manifest into Mission Control status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      source: 'dimitri:connection-status',
      generatedAt: '2026-06-16T00:00:00.000Z',
      connections: [
        { id: 'embed', label: 'Partner embed', state: 'ready', safeForMissionControl: true, detail: 'ok' },
        { id: 'telegram', label: 'Telegram', state: 'blocked', safeForMissionControl: true, detail: 'missing env', nextAction: 'Set env' },
        { id: 'odd', label: 'Odd', state: 'surprise', safeForMissionControl: true, detail: 'unknown state' },
        { id: 'internal', label: 'Internal detail', state: 'connected', safeForMissionControl: false, endpoint: 'http://localhost/admin' },
      ],
    }), { status: 200 })))

    const status = await loadProjectIntegrationStatus({
      name: 'Dimitri-ITR',
      integration_status_url: 'https://dimitri-itr-sandbox.vercel.app/api/v1/connections/status',
    })

    expect(status?.ok).toBe(true)
    expect(status?.source).toBe('dimitri:connection-status')
    expect(status?.summary).toMatchObject({ total: 3, ready: 1, blocked: 1, unknown: 1 })
    expect(status?.connections[1]).toEqual({ id: 'telegram', label: 'Telegram', state: 'blocked' })
  })

  it('captures non-200 manifests as actionable errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))

    const status = await loadProjectIntegrationStatus({
      name: 'Dimitri-ITR',
      integration_status_url: 'https://dimitri-itr-sandbox.vercel.app/api/v1/connections/status',
    })

    expect(status?.ok).toBe(false)
    expect(status?.error).toContain('503')
    expect(status?.summary.total).toBe(0)
  })

  it('rejects unapproved or non-HTTPS manifest URLs without fetching', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const status = await loadProjectIntegrationStatus({
      name: 'Unsafe',
      integration_status_url: 'http://127.0.0.1:54321/status',
    })

    expect(status?.ok).toBe(false)
    expect(status?.error).toBe('status endpoint host is not approved')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the RestoreAssist bearer token when the env var is set', async () => {
    vi.stubEnv('RESTOREASSIST_CONNECTIONS_STATUS_TOKEN', 'ra-token')
    const fetch = vi.fn(async () => new Response(JSON.stringify({ connections: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    const status = await loadProjectIntegrationStatus({
      name: 'RestoreAssist',
      integration_status_url: 'https://restoreassist.app/api/v1/connections/status',
    })

    expect(status?.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'https://restoreassist.app/api/v1/connections/status',
      expect.objectContaining({
        headers: { Accept: 'application/json', Authorization: 'Bearer ra-token' },
      }),
    )
  })

  it('fetches anonymously when the RestoreAssist token env var is unset', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    vi.stubGlobal('fetch', fetch)

    const status = await loadProjectIntegrationStatus({
      name: 'RestoreAssist',
      integration_status_url: 'https://restoreassist.app/api/v1/connections/status',
    })

    expect(status?.ok).toBe(false)
    expect(status?.error).toContain('401')
    expect(fetch).toHaveBeenCalledWith(
      'https://restoreassist.app/api/v1/connections/status',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('never attaches the RestoreAssist token to other hosts', async () => {
    vi.stubEnv('RESTOREASSIST_CONNECTIONS_STATUS_TOKEN', 'ra-token')
    const fetch = vi.fn(async () => new Response(JSON.stringify({ connections: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    await loadProjectIntegrationStatus({
      name: 'Synthex',
      integration_status_url: 'https://synthex.social/api/v1/connections/status',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://synthex.social/api/v1/connections/status',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('normalises the Disaster-Recovery manifest fetched anonymously', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      source: 'disaster-recovery:connection-status',
      generatedAt: '2026-07-16T11:29:15.180Z',
      connections: [
        { id: 'database', label: 'Primary database (Prisma)', state: 'connected', safeForMissionControl: true, detail: 'DATABASE_URL is configured' },
        { id: 'auth', label: 'Authentication (NextAuth)', state: 'connected', safeForMissionControl: true },
        { id: 'telegram', label: 'Telegram', state: 'blocked', safeForMissionControl: true, detail: 'missing env' },
      ],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    const status = await loadProjectIntegrationStatus({
      name: 'Disaster-Recovery',
      integration_status_url: 'https://disasterrecovery.com.au/api/v1/connections/status',
    })

    expect(status?.ok).toBe(true)
    expect(status?.source).toBe('disaster-recovery:connection-status')
    expect(status?.summary).toMatchObject({ total: 3, connected: 2, blocked: 1 })
    expect(fetch).toHaveBeenCalledWith(
      'https://disasterrecovery.com.au/api/v1/connections/status',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('never attaches the RestoreAssist token to the Disaster-Recovery host', async () => {
    vi.stubEnv('RESTOREASSIST_CONNECTIONS_STATUS_TOKEN', 'ra-token')
    const fetch = vi.fn(async () => new Response(JSON.stringify({ connections: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    await loadProjectIntegrationStatus({
      name: 'Disaster-Recovery',
      integration_status_url: 'https://disasterrecovery.com.au/api/v1/connections/status',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://disasterrecovery.com.au/api/v1/connections/status',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('parses the anonymous DR-NRPG manifest into Mission Control status', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      source: 'dr-nrpg:connection-status',
      generatedAt: '2026-07-16T00:00:00.000Z',
      connections: [
        { id: 'database', label: 'Primary database (Prisma)', state: 'connected', safeForMissionControl: true, detail: 'ok' },
        { id: 'supabase', label: 'Supabase (storage + realtime)', state: 'ready', safeForMissionControl: true, detail: 'ok' },
        { id: 'stripe', label: 'Payments (Stripe)', state: 'blocked', safeForMissionControl: true, detail: 'no key', nextAction: 'Set the Stripe key pair.' },
      ],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    const status = await loadProjectIntegrationStatus({
      name: 'DR-NRPG',
      integration_status_url: 'https://nrpg.business/api/v1/connections/status',
    })

    expect(status?.ok).toBe(true)
    expect(status?.source).toBe('dr-nrpg:connection-status')
    expect(status?.summary).toMatchObject({ total: 3, connected: 1, ready: 1, blocked: 1 })
    // Anonymous fetch — no Authorization header ever attached to nrpg.business.
    expect(fetch).toHaveBeenCalledWith(
      'https://nrpg.business/api/v1/connections/status',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('never attaches the RestoreAssist token to nrpg.business', async () => {
    vi.stubEnv('RESTOREASSIST_CONNECTIONS_STATUS_TOKEN', 'ra-token')
    const fetch = vi.fn(async () => new Response(JSON.stringify({ connections: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    await loadProjectIntegrationStatus({
      name: 'DR-NRPG',
      integration_status_url: 'https://nrpg.business/api/v1/connections/status',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://nrpg.business/api/v1/connections/status',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('loads only projects with integration status URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ connections: [] }), { status: 200 })))

    const statuses = await loadProjectIntegrationStatuses([
      { name: 'Dimitri-ITR', integration_status_url: 'https://dimitri-itr-sandbox.vercel.app/status' },
      { name: 'Synthex', integration_status_url: 'https://synthex.social/api/v1/connections/status' },
      { name: 'RestoreAssist', integration_status_url: null },
    ])

    expect(statuses.map((status) => status.projectName)).toEqual(['Dimitri-ITR', 'Synthex'])
  })
})
