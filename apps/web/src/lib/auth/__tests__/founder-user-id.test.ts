import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { getFounderUserId } from '@/lib/auth/founder-user-id'

function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return findRouteFiles(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}

const DIRECT_FOUNDER_USER_ID_ACCESS =
  /process\s*\.\s*env(?:\s*\.\s*FOUNDER_USER_ID|\s*\[\s*(['"])FOUNDER_USER_ID\1\s*\])/

function hasDirectFounderUserIdAccess(source: string): boolean {
  return DIRECT_FOUNDER_USER_ID_ACCESS.test(source)
}

describe('getFounderUserId', () => {
  it('trims pasted whitespace before a UUID reaches a query', () => {
    expect(getFounderUserId({ FOUNDER_USER_ID: '  founder-uuid\r\n' })).toBe('founder-uuid')
  })

  it('returns null for a missing or whitespace-only value', () => {
    expect(getFounderUserId({})).toBeNull()
    expect(getFounderUserId({ FOUNDER_USER_ID: ' \n\t' })).toBeNull()
  })
})

describe('cron founder actor convention', () => {
  it.each([
    'const founderId = process.env.FOUNDER_USER_ID',
    "const founderId = process.env['FOUNDER_USER_ID']",
    'const founderId = process.env["FOUNDER_USER_ID"]',
  ])('detects direct environment access in %s', (source) => {
    expect(hasDirectFounderUserIdAccess(source)).toBe(true)
  })

  it('allows the canonical accessor import and call', () => {
    const source = [
      "import { getFounderUserId } from '@/lib/auth/founder-user-id'",
      'const founderId = getFounderUserId()',
    ].join('\n')

    expect(hasDirectFounderUserIdAccess(source)).toBe(false)
  })

  it('routes every cron through the canonical accessor', () => {
    const routes = findRouteFiles(join(process.cwd(), 'src/app/api/cron'))
    const offenders = routes.filter((route) =>
      hasDirectFounderUserIdAccess(readFileSync(route, 'utf8'))
    )

    expect(routes.length).toBeGreaterThan(0)
    expect(offenders).toEqual([])
  })
})
