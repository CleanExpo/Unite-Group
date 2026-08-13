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
  it('routes every cron through the canonical accessor', () => {
    const routes = findRouteFiles(join(process.cwd(), 'src/app/api/cron'))
    const offenders = routes.filter((route) =>
      readFileSync(route, 'utf8').includes('process.env.FOUNDER_USER_ID')
    )

    expect(routes.length).toBeGreaterThan(0)
    expect(offenders).toEqual([])
  })
})
