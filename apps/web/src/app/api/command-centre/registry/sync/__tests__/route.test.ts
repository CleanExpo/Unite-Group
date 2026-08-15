import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/capabilities', () => ({ getCapabilityManifest: vi.fn() }))
vi.mock('@/lib/command-centre/registry-sync', () => ({
  syncCapabilityRegistry: vi.fn(),
  readRegistryTools: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getCapabilityManifest } from '@/lib/command-centre/capabilities'
import { readRegistryTools, syncCapabilityRegistry } from '@/lib/command-centre/registry-sync'
import { GET, POST } from '../route'

const POPULATED_MANIFEST = {
  schema_version: 1,
  generated_from: 'apps/web',
  agents: [{ name: 'qa-tester', role: 'QA', model_tier: null, skills: [], definition_path: 'p' }],
  skills: [{ name: 'seo', description: '', definition_path: 'x/SKILL.md' }],
  mcp_servers: [{ name: 'context7', transport: 'stdio', description: '', config_path: '.mcp.json' }],
}

const EMPTY_MANIFEST = {
  schema_version: 1,
  generated_from: '',
  agents: [],
  skills: [],
  mcp_servers: [],
}

describe('POST /api/command-centre/registry/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await POST()).status).toBe(401)
    expect(syncCapabilityRegistry).not.toHaveBeenCalled()
  })

  it('writes the discovered capabilities for the authenticated founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockResolvedValue(POPULATED_MANIFEST as any)
    vi.mocked(syncCapabilityRegistry).mockResolvedValue({ agents: 1, tools: 2, errors: [] })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.written).toEqual({ agents: 1, tools: 2 })
    expect(syncCapabilityRegistry).toHaveBeenCalledWith({ founderId: 'founder-1' })
  })

  it('refuses rather than reporting a successful sync of zero capabilities', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockResolvedValue(EMPTY_MANIFEST as any)

    const res = await POST()

    // An empty manifest means prebuild discovery did not run. A 200 here is how
    // an empty registry stays invisible.
    expect(res.status).toBe(503)
    expect(syncCapabilityRegistry).not.toHaveBeenCalled()
  })

  it('reports a partial write as 207, not 200', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockResolvedValue(POPULATED_MANIFEST as any)
    vi.mocked(syncCapabilityRegistry).mockResolvedValue({
      agents: 1,
      tools: 0,
      errors: ['cc_tools: permission denied'],
    })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(207)
    expect(body.ok).toBe(false)
    expect(body.errors).toEqual(['cc_tools: permission denied'])
  })

  it('sanitises an unexpected failure', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockRejectedValue(new Error('connection string leaked'))

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to sync the capability registry')
    expect(body.error).not.toContain('connection string leaked')
  })
})

describe('GET /api/command-centre/registry/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('flags sync_required when capabilities exist on disk but the registry is empty', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockResolvedValue(POPULATED_MANIFEST as any)
    vi.mocked(readRegistryTools).mockResolvedValue([])

    const body = await (await GET()).json()

    expect(body.registered_tools).toBe(0)
    expect(body.sync_required).toBe(true)
  })

  it('does not flag sync_required once the registry holds rows', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockResolvedValue(POPULATED_MANIFEST as any)
    vi.mocked(readRegistryTools).mockResolvedValue([{ tool_key: 'skill:seo' } as any])

    const body = await (await GET()).json()

    expect(body.registered_tools).toBe(1)
    expect(body.sync_required).toBe(false)
  })

  it('does not flag sync_required when there is nothing on disk to register', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as any)
    vi.mocked(getCapabilityManifest).mockResolvedValue(EMPTY_MANIFEST as any)
    vi.mocked(readRegistryTools).mockResolvedValue([])

    const body = await (await GET()).json()

    expect(body.sync_required).toBe(false)
  })
})
