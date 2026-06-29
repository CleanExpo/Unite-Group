import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('router route generation invalidation', () => {
  it('keeps the generated TanStack route tree in vite watch.ignored to avoid reload loops', () => {
    const viteConfig = readFileSync(
      resolve(process.cwd(), 'vite.config.ts'),
      'utf8',
    )

    // Deliberately watch-ignored: the custom dev server regenerates
    // routeTree.gen.ts on activity, and watching it triggers spurious full
    // reloads (see the rationale comment in vite.config.ts). This guard fails
    // if someone removes the ignore and reintroduces the reload loop.
    expect(viteConfig).toContain('**/routeTree.gen.ts')
  })
})
