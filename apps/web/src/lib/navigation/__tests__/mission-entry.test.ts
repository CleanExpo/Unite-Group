import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'

describe('canonical Mission Control entry', () => {
  it('adds only exact public aliases and never redirects operational child routes', async () => {
    const configUrl = pathToFileURL(join(process.cwd(), 'next.config.mjs')).href
    const config = (await import(configUrl)).default
    const redirects = await config.redirects()
    const aliases = redirects.filter((entry: { destination: string }) => entry.destination === '/founder/command-centre')
    expect(aliases.map((entry: { source: string }) => entry.source)).toEqual(['/founder', '/dashboard', '/command-centre', '/mission-control', '/founder/dashboard', '/founder/workspace', '/founder/nexus-status'])
    expect(aliases.every((entry: { source: string }) => !entry.source.includes(':') && !entry.source.includes('*'))).toBe(true)
  })
  it('points entry fallbacks directly home while login continues validating return paths', () => {
    for (const file of ['src/app/page.tsx', 'src/app/(auth)/auth/login/page.tsx', 'src/app/(auth)/auth/reset-password/page.tsx', 'src/app/(founder)/founder/workspace/page.tsx', 'src/app/(founder)/error.tsx']) {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      expect(source).toContain('/founder/command-centre')
      expect(source).not.toContain('/founder/dashboard')
    }
    const login = readFileSync(join(process.cwd(), 'src/app/(auth)/auth/login/page.tsx'), 'utf8')
    expect(login).toContain('!/^\\/(?!\\/)/.test(value)')
    expect(login).toContain('return value;')
  })
})
