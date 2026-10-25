import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const app = join(__dirname, '..')

describe('legal pages keep their list bullets', () => {
  it('the prose module restores disc markers and indent', () => {
    const css = readFileSync(join(app, 'legal-prose.module.css'), 'utf8')
    expect(css).toMatch(/\.prose ul\s*\{[^}]*list-style:\s*disc/)
    expect(css).toMatch(/\.prose ul\s*\{[^}]*padding-left:\s*1\.25rem/)
  })
  for (const page of ['privacy-policy', 'terms-of-service']) {
    it(`${page} applies the prose class to its main element`, () => {
      const src = readFileSync(join(app, page, 'page.tsx'), 'utf8')
      expect(src).toContain("import styles from '../legal-prose.module.css'")
      expect(src).toMatch(/<main className=\{`[^`]*\$\{styles\.prose\}`\}>/)
    })
  }
})
