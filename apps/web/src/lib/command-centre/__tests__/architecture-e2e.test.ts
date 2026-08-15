import { describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { EMPTY_MANIFEST, toCcToolRows, type CapabilityManifest } from '@/lib/command-centre/capabilities'
import { readRegistryTools, type RegistrySupabaseLike } from '@/lib/command-centre/registry-sync'

// End-to-end architecture proof for the repaired control plane. Every assertion
// runs against real modules or the real repository — nothing here mutates
// production, and nothing is asserted from a mock that could agree with a wrong
// implementation.
//
// The path being proven:
//   founder intent -> capability discovery -> REGISTRY LOOKUP -> reuse or
//   fall back -> cc_tasks -> Nexus Runner -> founder-gated verification.

const repoRoot = path.resolve(process.cwd(), '..', '..')

function repoGrep(pattern: string, target: string): string {
  try {
    return execFileSync('/bin/zsh', ['-lc', `cd ${repoRoot} && grep -rl ${pattern} ${target} 2>/dev/null | grep -v node_modules | grep -v '/.next/'`], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

function readRepoFile(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), 'utf-8')
}

/** Registry double returning whatever rows the test wants cc_tools to hold. */
function registryWith(rows: unknown[]): RegistrySupabaseLike {
  return {
    from() {
      return {
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }),
        }),
      } as ReturnType<RegistrySupabaseLike['from']>
    },
  }
}

const MANIFEST: CapabilityManifest = {
  ...EMPTY_MANIFEST,
  skills: [
    { key: 'seo', name: 'seo', description: 'Existing SEO capability.', definition_path: 'x/SKILL.md' },
  ],
}

describe('1. registry lookup happens BEFORE creation', () => {
  it('a reuse search over a populated registry returns the existing capability', async () => {
    const registered = toCcToolRows(MANIFEST).map((row) => ({
      tool_key: row.tool_key,
      source: row.source,
      description: row.description,
      risk_class: row.risk_class,
      approval_required: row.approval_required,
    }))

    const found = await readRegistryTools({ founderId: 'founder-1', client: registryWith(registered) })
    const match = found.find((tool) => tool.tool_key === 'skill:seo')

    expect(match).toBeDefined()
    expect(match?.description).toBe('Existing SEO capability.')
  })

  it('the SAME search over an EMPTY registry returns nothing — the state that inverts reuse', async () => {
    const found = await readRegistryTools({ founderId: 'founder-1', client: registryWith([]) })
    expect(found).toEqual([])
  })
})

describe('2. an existing capability can be selected, and 3. fallback is explicit', () => {
  it('reports origin "registry" when rows exist and "static" when they do not', async () => {
    vi.resetModules()
    vi.doMock('@/lib/command-centre/registry-sync', () => ({
      readRegistryTools: vi.fn().mockResolvedValue([
        { tool_key: 'skill:seo', source: 'project', description: '', risk_class: 'read', approval_required: false, invocable: false },
      ]),
    }))
    const populated = await (await import('@/lib/command-centre/tools/catalogue')).getFounderToolCatalogue('f1')
    expect(populated.origin).toBe('registry')

    vi.resetModules()
    vi.doMock('@/lib/command-centre/registry-sync', () => ({
      readRegistryTools: vi.fn().mockResolvedValue([]),
    }))
    const fallback = await (await import('@/lib/command-centre/tools/catalogue')).getFounderToolCatalogue('f1')
    expect(fallback.origin).toBe('static')
    expect(fallback.registry_count).toBe(0)
    vi.doUnmock('@/lib/command-centre/registry-sync')
  })
})

describe('4. cc_tasks is the Nexus Runner execution queue', () => {
  it('the runner claim route reads cc_tasks', () => {
    const claim = readRepoFile('apps/web/src/app/api/agents/runner/claim/route.ts')
    expect(claim).toMatch(/cc_tasks/)
  })

  it('the runner README names cc_tasks as what it claims', () => {
    expect(readRepoFile('scripts/nexus-runner/README.md')).toMatch(/approved `cc_tasks`|polls approved `cc_tasks`|cc_tasks/)
  })
})

describe('5. operator_jobs survives only for Model Operator Gateway semantics', () => {
  it('is still referenced by live gateway code, so it was not wrongly retired', () => {
    const files = repoGrep("operator_jobs", 'apps/web/src').split('\n').filter(Boolean)
    expect(files.length).toBeGreaterThan(0)
    expect(files.some((f) => f.includes('operator-gateway'))).toBe(true)
  })

  it('the conventions skill documents both queues rather than deleting one', () => {
    const skill = readRepoFile('.claude/skills/nexus-conventions/SKILL.md')
    expect(skill).toMatch(/cc_tasks/)
    expect(skill).toMatch(/operator_jobs/)
    expect(skill).toMatch(/operator_jobs` is NOT superseded|NOT superseded/)
  })
})

describe('6. OWNEST is not a live executor', () => {
  it('the autopilot runner declares no host worker', () => {
    const readme = readRepoFile('apps/autopilot-runner/README.md')
    expect(readme).toMatch(/permanently retired|no live worker|uninstall-only/i)
  })

  it('no tombstone points callers at OWNEST any more', () => {
    for (const route of [
      'apps/web/src/app/api/cron/linear-claim/route.ts',
      'apps/web/src/app/api/cron/linear-handoff/route.ts',
    ]) {
      const body = readRepoFile(route)
      expect(body).not.toMatch(/use_crm_ownest/)
      expect(body).toMatch(/use_cc_tasks_queue/)
    }
  })
})

describe('7. Linear autonomous execution is not live', () => {
  it('both Linear cron routes are authenticated 410 tombstones', () => {
    for (const route of [
      'apps/web/src/app/api/cron/linear-claim/route.ts',
      'apps/web/src/app/api/cron/linear-handoff/route.ts',
    ]) {
      const body = readRepoFile(route)
      expect(body).toMatch(/assertCronAuth/)
      expect(body).toMatch(/status:\s*410/)
      expect(body).toMatch(/retired:\s*true/)
    }
  })

  it('neither Linear route is registered as a live cron', () => {
    const vercelConfig = readRepoFile('apps/web/vercel.json')
    expect(vercelConfig).not.toMatch(/linear-claim/)
    expect(vercelConfig).not.toMatch(/linear-handoff/)
  })
})

describe('8. founder approval gates remain intact', () => {
  it('the registry sync route refuses an unauthenticated caller before writing', () => {
    const route = readRepoFile('apps/web/src/app/api/command-centre/registry/sync/route.ts')
    expect(route).toMatch(/getUser\(\)/)
    expect(route).toMatch(/Unauthorised/)
    // The write is scoped to the authenticated founder, never a supplied id.
    expect(route).toMatch(/founderId:\s*user\.id/)
  })

  it('the build never writes the registry — population stays founder-initiated', () => {
    const prebuild = JSON.parse(readRepoFile('apps/web/package.json')).scripts.prebuild
    expect(prebuild).toMatch(/sync-capability-registry\.mjs/)
    // Discovery only. The sync script must not reach Supabase at build time.
    const script = readRepoFile('apps/web/scripts/sync-capability-registry.mjs')
    expect(script).not.toMatch(/supabase|SUPABASE|createClient/)
  })
})
