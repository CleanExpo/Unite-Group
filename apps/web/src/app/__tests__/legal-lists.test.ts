import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'

const app = join(__dirname, '..')

// SOURCE PINS on legal-prose.module.css and the two page files. The CSS test asserts declared text as
// postcss reads it; the page tests assert that a text pattern occurs somewhere in the file. Neither
// asserts what the browser paints or renders. For a CSS property, the value read is the last
// declaration of it, in file order, across the top-level rules whose selector is exactly the one named.
//
// KNOWN LIMITS (accepted; the rendered guard is tracked as UNI-3025):
//  - commented-out JSX: the page tests match source text, so a matching string inside a comment passes.
//  - the page tests do not check that the matched text belongs to the element that is rendered.
//  - !important and declaration priority: declarations are read by position, not by priority.
//  - rules inside @media, @supports or @layer are not read.
//  - a later rule with another selector, or a shorthand such as `padding`, that changes the painted result.
//  - list-style is read as list-style-type; a shorthand value is compared as a whole string.
function lastDeclared(selector: string): Map<string, string> {
  const root = postcss.parse(readFileSync(join(app, 'legal-prose.module.css'), 'utf8'))
  const out = new Map<string, string>()
  let rules = 0
  for (const node of root.nodes) {
    if (node.type !== 'rule' || node.selector !== selector) continue
    rules++
    node.each((child) => {
      if (child.type !== 'decl') return
      // list-style is a shorthand for list-style-type, so either one sets the marker.
      const prop = child.prop === 'list-style' ? 'list-style-type' : child.prop
      out.set(prop, child.value.trim())
    })
  }
  if (rules === 0) throw new Error(`no active ${selector} rule in legal-prose.module.css`)
  return out
}

describe('source pins: legal list CSS and page wiring', () => {
  it('source pin: the last list-style declaration in .prose ul reads disc and the last padding-left reads 1.25rem', () => {
    const ul = lastDeclared('.prose ul')
    expect(ul.get('list-style-type')).toBe('disc')
    expect(ul.get('padding-left')).toBe('1.25rem')
  })
  for (const page of ['privacy-policy', 'terms-of-service']) {
    it(`source match: ${page}/page.tsx text contains the legal-prose.module.css import line and a <main className={\`...\${styles.prose}\`}> string`, () => {
      const src = readFileSync(join(app, page, 'page.tsx'), 'utf8')
      expect(src).toContain("import styles from '../legal-prose.module.css'")
      expect(src).toMatch(/<main className=\{`[^`]*\$\{styles\.prose\}`\}>/)
    })
  }
})
