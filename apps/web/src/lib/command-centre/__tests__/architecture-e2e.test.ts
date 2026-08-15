import { describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
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

/**
 * Files under `target` whose contents contain `needle`, as repo-relative paths.
 *
 * Implemented with node:fs. An earlier cut delegated the search to a zsh
 * subprocess, which the ubuntu-latest CI runner does not provide: the catch
 * swallowed the ENOENT and returned '', so the search reported zero matches
 * for a reason that had nothing to do with the repository. A search that can
 * silently answer "nothing" when it never ran is not a search — this version
 * reads the tree directly and has no catch-all.
 *
 * ALL test source is skipped, and that exclusion is load-bearing rather than
 * tidy. This file lives under `apps/web/src`, so a walk that included it would
 * match the assertion lines below: searching for `operator_jobs` would find
 * THIS file's own source and report a hit even if production code had none.
 * The proof is about production source, so the proof must not be able to see
 * itself.
 *
 * Excluding only the `__tests__` directory is NOT enough — apps/web/src holds
 * 40 `*.test.ts` / `*.test.tsx` files outside any `__tests__` directory. None
 * of them mentions `operator_jobs` today, so the current verdict is sound, but
 * a future one would silently be counted as production evidence. The filename
 * predicate closes that before it can happen.
 */
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/
const SEARCHABLE = /\.(ts|tsx|mjs|js|jsx|sql|md|json)$/

function repoGrep(needle: string, target: string): string[] {
  const skipDir = new Set(['node_modules', '.next', '.git', '__tests__', '__mocks__', '__fixtures__'])
  const matches: string[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skipDir.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (SEARCHABLE.test(entry.name) && !TEST_FILE.test(entry.name)) {
        if (readFileSync(full, 'utf-8').includes(needle)) {
          matches.push(path.relative(repoRoot, full).replace(/\\/g, '/'))
        }
      }
    }
  }

  walk(path.join(repoRoot, target))
  return matches
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
    // Positive and NEGATIVE control, in that order. Without both, a broken
    // search and a genuinely retired queue produce the same empty result —
    // which is how this test failed on CI while passing locally.
    // The negative control is what catches a search that matches ITSELF: with
    // `__tests__` in scope this line's own nonsense symbol scored a hit.
    expect(repoGrep('cc_tasks', 'apps/web/src').length).toBeGreaterThan(0)
    expect(repoGrep('zzz_symbol_that_must_not_exist_zzz', 'apps/web/src')).toEqual([])

    const files = repoGrep('operator_jobs', 'apps/web/src')
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
