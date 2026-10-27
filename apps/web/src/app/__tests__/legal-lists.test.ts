import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import postcss from 'postcss'

import PrivacyPolicyPage from '../privacy-policy/page'
import TermsOfServicePage from '../terms-of-service/page'

// The privacy policy and terms render through the shared legal shell (076b0a91) in its 'site' tone, so the
// bullets come from the .proseSite rules in components/public/legal-shell.module.css.
const SHELL_CSS = join(__dirname, '..', '..', 'components', 'public', 'legal-shell.module.css')
const UL = '.proseSite :global(section ul)'

// SOURCE PIN on legal-shell.module.css, plus a render check that the pages use that rule's container.
// For a CSS property, the value read is the last declaration of it, in file order, across the top-level
// rules whose selector list contains the one named.
//
// KNOWN LIMITS (accepted; the rendered guard is tracked as UNI-3025):
//  - !important and declaration priority: declarations are read by position, not by priority.
//  - rules inside @media, @supports or @layer are not read.
//  - a later rule with another selector, or a shorthand such as `padding`, that changes the painted result.
//  - list-style is read as list-style-type; a shorthand value is compared as a whole string.
function lastDeclared(selector: string): Map<string, string> {
  const root = postcss.parse(readFileSync(SHELL_CSS, 'utf8'))
  const out = new Map<string, string>()
  let rules = 0
  for (const node of root.nodes) {
    if (node.type !== 'rule' || !node.selectors.includes(selector)) continue
    rules++
    node.each((child) => {
      if (child.type !== 'decl') return
      // list-style is a shorthand for list-style-type, so either one sets the marker.
      const prop = child.prop === 'list-style' ? 'list-style-type' : child.prop
      out.set(prop, child.value.trim())
    })
  }
  if (rules === 0) throw new Error(`no active ${selector} rule in legal-shell.module.css`)
  return out
}

describe('source pins: legal list CSS and page wiring', () => {
  it(`source pin: the last list-style declaration in ${UL} reads disc and the last padding-left reads 1.25rem`, () => {
    const ul = lastDeclared(UL)
    expect(ul.get('list-style-type')).toBe('disc')
    expect(ul.get('padding-left')).toBe('1.25rem')
  })
  it.each([
    ['privacy-policy', PrivacyPolicyPage],
    ['terms-of-service', TermsOfServicePage],
  ])('render: %s puts its bulleted sections inside the .proseSite container', (_page, Page) => {
    const html = renderToStaticMarkup(createElement(Page))
    const from = html.search(/<div class="[^"]*proseSite[^"]*"/)
    expect(from, 'proseSite container').toBeGreaterThan(-1)
    const prose = html.slice(from, html.indexOf('</main>', from))
    expect(prose).toMatch(/<section[\s>][\s\S]*?<ul[\s>]/)
  })
})
