import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'

// UNI-2779 — mission-authority.json has ONE canonical source, outside apps/web.
// The default `next build` (Turbopack) only resolves it because next.config.mjs
// widens turbopack.root to the monorepo root; production (`--webpack`) keeps the
// previous root so its output layout does not change.

const WEB_ROOT = path.resolve(__dirname, '../../../..')
const REPO_ROOT = path.resolve(WEB_ROOT, '../..')
const CANONICAL = path.join(REPO_ROOT, 'scripts', 'nexus-runner', 'mission-authority.json')
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

describe('mission-authority.json canonical source', () => {
  it('imports the same content that is in the canonical file (sha256 of the canonical serialisation)', () => {
    const raw = readFileSync(CANONICAL, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    expect(sha256(JSON.stringify(policy))).toBe(sha256(JSON.stringify(parsed)))
    expect(policy).toStrictEqual(parsed)
  })

  it('re-serialises the imported value to the canonical file byte for byte', () => {
    // The canonical file is written as JSON.stringify(value, null, 2) plus a trailing newline,
    // so the runtime value reproduces its exact bytes: nothing was dropped, coerced or reordered.
    const bytes = readFileSync(CANONICAL)
    expect(Buffer.from(`${JSON.stringify(policy, null, 2)}\n`, 'utf8').equals(bytes)).toBe(true)
  })
})

describe('next.config.mjs turbopack.root', () => {
  const originalTurbopack = process.env.TURBOPACK
  afterEach(() => {
    if (originalTurbopack === undefined) delete process.env.TURBOPACK
    else process.env.TURBOPACK = originalTurbopack
    vi.resetModules()
  })

  async function loadRoot(turbopack: string | undefined): Promise<string> {
    if (turbopack === undefined) delete process.env.TURBOPACK
    else process.env.TURBOPACK = turbopack
    const href = `${pathToFileURL(path.join(WEB_ROOT, 'next.config.mjs')).href}?t=${String(turbopack)}-${Math.random()}`
    const mod = (await import(/* @vite-ignore */ href)) as { default: { turbopack: { root: string } } }
    return mod.default.turbopack.root
  }

  it('contains the canonical file when Turbopack is the bundler (so it can resolve the import)', async () => {
    const root = await loadRoot('1')
    expect(root).toBe(REPO_ROOT)
    expect(path.relative(root, CANONICAL).startsWith('..')).toBe(false)
  })

  it('keeps the previous process.cwd() root for webpack builds (production output unchanged)', async () => {
    expect(await loadRoot(undefined)).toBe(path.resolve(process.cwd()))
  })
})
