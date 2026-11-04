import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Board member addresses are personal data and live only on the invite rows, never in source. This guard keeps
// every file of the board feature (code and tests) free of anything shaped like an email address, so a real
// address cannot slip in later as a "fixture".
const FEATURE_PATHS = [
  'src/lib/portal/board',
  'src/app/(portal)/portal/board',
  'src/app/(founder)/founder/portal-invites/board-invitees.tsx',
  'src/app/(founder)/founder/portal-invites/__tests__/board-invitees.test.tsx',
]
const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path]
  return readdirSync(path).flatMap((name) => files(join(path, name)))
}

describe('board feature holds no email addresses', () => {
  it('finds no address-shaped string in any board feature file', () => {
    const all = FEATURE_PATHS.flatMap(files)
    expect(all.length).toBeGreaterThan(5)
    const offenders = all.filter((file) => ADDRESS.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
