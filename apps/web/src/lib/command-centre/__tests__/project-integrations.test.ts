import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  loadProjectIntegrationStatus,
  loadProjectIntegrationStatuses,
} from '@/lib/command-centre/project-integrations'

afterEach(() => {
  vi.unstubAllGlobals()
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

  it('loads only projects with integration status URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ connections: [] }), { status: 200 })))

    const statuses = await loadProjectIntegrationStatuses([
      { name: 'Dimitri-ITR', integration_status_url: 'https://dimitri-itr-sandbox.vercel.app/status' },
      { name: 'RestoreAssist', integration_status_url: null },
    ])

    expect(statuses.map((status) => status.projectName)).toEqual(['Dimitri-ITR'])
  })
})
