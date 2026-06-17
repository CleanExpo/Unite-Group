import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

describe('command center page source', () => {
  it('surfaces provider capacity beside live agent operations', () => {
    const page = readFileSync(join(root, 'src/app/(founder)/founder/command-center/page.tsx'), 'utf8')

    expect(page).toContain('ProviderUsageCockpit')
    expect(page).toContain('AI provider capacity')
    expect(page).toContain('LiveAgentOperationsMap')
    expect(page).toMatch(/xl:grid-cols-\[22rem_minmax\(0,1fr\)\]/)
  })
})
