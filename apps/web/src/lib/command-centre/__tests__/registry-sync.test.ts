import { describe, expect, it, vi } from 'vitest'

import { EMPTY_MANIFEST, type CapabilityManifest } from '@/lib/command-centre/capabilities'
import {
  readRegistryTools,
  syncCapabilityRegistry,
  type RegistrySupabaseLike,
} from '@/lib/command-centre/registry-sync'

function manifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return { ...EMPTY_MANIFEST, ...overrides }
}

/** Records every upsert so the founder scoping and conflict target can be asserted. */
function upsertRecorder(errorByTable: Record<string, string> = {}) {
  const calls: Array<{ table: string; rows: Array<Record<string, unknown>>; onConflict?: string }> = []
  const client: RegistrySupabaseLike = {
    from(table: string) {
      return {
        upsert: async (values: unknown, options?: { onConflict?: string }) => {
          calls.push({
            table,
            rows: values as Array<Record<string, unknown>>,
            onConflict: options?.onConflict,
          })
          const message = errorByTable[table]
          return { error: message ? { message } : null }
        },
        select: () => ({
          eq: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
        }),
      } as ReturnType<RegistrySupabaseLike['from']>
    },
  }
  return { client, calls }
}

const SAMPLE = manifest({
  agents: [{ key: 'qa-tester', name: 'qa-tester', role: 'QA', model_tier: null, skills: [], definition_path: 'p' }],
  skills: [{ key: 'seo', name: 'seo', description: 'SEO.', definition_path: 'x/SKILL.md' }],
  mcp_servers: [{ name: 'context7', transport: 'stdio', description: '', config_path: '.mcp.json' }],
})

describe('syncCapabilityRegistry', () => {
  it('writes every row founder-scoped, on the unique constraints', async () => {
    const { client, calls } = upsertRecorder()

    const result = await syncCapabilityRegistry({ founderId: 'founder-1', manifest: SAMPLE, client })

    expect(result).toEqual({ agents: 1, tools: 2, errors: [] })

    const agentCall = calls.find((call) => call.table === 'cc_agents')
    const toolCall = calls.find((call) => call.table === 'cc_tools')
    expect(agentCall?.onConflict).toBe('founder_id,name')
    expect(toolCall?.onConflict).toBe('founder_id,tool_key')
    for (const call of calls) {
      for (const row of call.rows) expect(row.founder_id).toBe('founder-1')
    }
  })

  it('is idempotent — the same manifest produces byte-identical rows', async () => {
    const first = upsertRecorder()
    const second = upsertRecorder()

    await syncCapabilityRegistry({ founderId: 'founder-1', manifest: SAMPLE, client: first.client })
    await syncCapabilityRegistry({ founderId: 'founder-1', manifest: SAMPLE, client: second.client })

    expect(second.calls).toEqual(first.calls)
  })

  it('reports a partial write instead of counting failed rows as written', async () => {
    const { client } = upsertRecorder({ cc_tools: 'permission denied for table cc_tools' })

    const result = await syncCapabilityRegistry({ founderId: 'founder-1', manifest: SAMPLE, client })

    expect(result.agents).toBe(1)
    expect(result.tools).toBe(0)
    expect(result.errors).toEqual(['cc_tools: permission denied for table cc_tools'])
  })

  it('writes nothing when the manifest is empty', async () => {
    const { client, calls } = upsertRecorder()

    const result = await syncCapabilityRegistry({ founderId: 'founder-1', manifest: EMPTY_MANIFEST, client })

    expect(result).toEqual({ agents: 0, tools: 0, errors: [] })
    expect(calls.every((call) => call.rows.length === 0)).toBe(true)
  })

  it('refuses to write without a founder id', async () => {
    const { client } = upsertRecorder()
    await expect(
      syncCapabilityRegistry({ founderId: '', manifest: SAMPLE, client }),
    ).rejects.toThrow(/founderId is required/)
  })

  it('batches large manifests rather than sending one oversized payload', async () => {
    const { client, calls } = upsertRecorder()
    const many = manifest({
      skills: Array.from({ length: 250 }, (_, index) => ({
        key: `skill-${index}`,
        name: `skill-${index}`,
        description: '',
        definition_path: `s/${index}/SKILL.md`,
      })),
    })

    const result = await syncCapabilityRegistry({ founderId: 'founder-1', manifest: many, client })

    expect(result.tools).toBe(250)
    const toolBatches = calls.filter((call) => call.table === 'cc_tools')
    expect(toolBatches).toHaveLength(3)
    expect(toolBatches.every((batch) => batch.rows.length <= 100)).toBe(true)
  })
})

/** Minimal read-path double returning a fixed `cc_tools` result. */
function selectStub(data: unknown, error: { message: string } | null = null) {
  const eqCalls: Array<[string, unknown]> = []
  const client: RegistrySupabaseLike = {
    from() {
      return {
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: (column: string, value: unknown) => {
            eqCalls.push([column, value])
            return {
              eq: (innerColumn: string, innerValue: unknown) => {
                eqCalls.push([innerColumn, innerValue])
                return { order: async () => ({ data, error }) }
              },
            }
          },
        }),
      } as ReturnType<RegistrySupabaseLike['from']>
    },
  }
  return { client, eqCalls }
}

describe('readRegistryTools', () => {
  it('maps registered rows and scopes the read to the founder and active rows', async () => {
    const { client, eqCalls } = selectStub([
      {
        tool_key: 'mcp:context7',
        source: 'mcp',
        description: 'Docs.',
        risk_class: 'read',
        approval_required: false,
      },
    ])

    const tools = await readRegistryTools({ founderId: 'founder-1', client })

    expect(tools).toEqual([
      {
        tool_key: 'mcp:context7',
        source: 'mcp',
        description: 'Docs.',
        risk_class: 'read',
        approval_required: false,
        invocable: false,
      },
    ])
    expect(eqCalls).toEqual([
      ['founder_id', 'founder-1'],
      ['active', true],
    ])
  })

  it('never marks a registered tool invocable', async () => {
    const { client } = selectStub([
      { tool_key: 'skill:seo', source: 'project', description: '', risk_class: 'read', approval_required: false },
    ])

    const [tool] = await readRegistryTools({ founderId: 'founder-1', client })

    expect(tool.invocable).toBe(false)
  })

  it('falls back to the safest classification for an unrecognised enum value', async () => {
    const { client } = selectStub([
      { tool_key: 'x', source: 'not-a-source', description: '', risk_class: 'not-a-class', approval_required: null },
    ])

    const [tool] = await readRegistryTools({ founderId: 'founder-1', client })

    expect(tool.source).toBe('local')
    expect(tool.risk_class).toBe('external')
    expect(tool.approval_required).toBe(true)
  })

  it('returns an empty list — not a throw — when the registry read errors', async () => {
    const { client } = selectStub(null, { message: 'relation "cc_tools" does not exist' })
    await expect(readRegistryTools({ founderId: 'founder-1', client })).resolves.toEqual([])
  })

  it('returns an empty list without a founder id', async () => {
    const { client } = selectStub([{ tool_key: 'x', source: 'mcp', description: '', risk_class: 'read', approval_required: true }])
    await expect(readRegistryTools({ founderId: '', client })).resolves.toEqual([])
  })
})

describe('getFounderToolCatalogue', () => {
  it('serves the registry and says so when cc_tools has rows', async () => {
    vi.resetModules()
    vi.doMock('@/lib/command-centre/registry-sync', () => ({
      readRegistryTools: vi.fn().mockResolvedValue([
        {
          tool_key: 'skill:seo',
          source: 'project',
          description: '',
          risk_class: 'read',
          approval_required: false,
          invocable: false,
        },
      ]),
    }))

    const { getFounderToolCatalogue } = await import('@/lib/command-centre/tools/catalogue')
    const result = await getFounderToolCatalogue('founder-1')

    expect(result.origin).toBe('registry')
    expect(result.registry_count).toBe(1)
    expect(result.tools).toHaveLength(1)
    vi.doUnmock('@/lib/command-centre/registry-sync')
  })

  it('falls back to the static set and reports origin "static" when the registry is empty', async () => {
    vi.resetModules()
    vi.doMock('@/lib/command-centre/registry-sync', () => ({
      readRegistryTools: vi.fn().mockResolvedValue([]),
    }))

    const { getFounderToolCatalogue, KNOWN_TOOLS } = await import('@/lib/command-centre/tools/catalogue')
    const result = await getFounderToolCatalogue('founder-1')

    // The failure this guards: a non-empty static catalogue masking an empty
    // registry, so nobody notices reuse-before-build is finding nothing.
    expect(result.origin).toBe('static')
    expect(result.registry_count).toBe(0)
    expect(result.tools.length).toBeGreaterThanOrEqual(KNOWN_TOOLS.length)
    vi.doUnmock('@/lib/command-centre/registry-sync')
  })
})
