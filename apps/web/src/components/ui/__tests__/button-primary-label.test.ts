import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import { buttonVariants } from '../button'

// SOURCE PINS, not a contrast check and not a rendering check. They assert only:
//  - the declared value text of four custom properties in the :root and .light rules of globals.css,
//    as postcss reads them (comments are not declarations), and
//  - the exact set of class names the default primary Button variant returns.
// They do not assert what colour the browser paints. The shipped colours were measured in a real
// browser at 6.38:1 at rest and 5.70:1 on hover (PR #1259 comment, a local measurement).
//
// A rule is read when its selector is exactly the one named and its parent is the stylesheet or an
// @layer block. For a property, the value read is the last declaration of it, in file order, across
// the rules read.
//
// KNOWN LIMITS (accepted; the rendered guard is tracked as UNI-3025):
//  - @layer order and an @layer nested in another at-rule: the parent check looks one level up only.
//  - @media, @supports and other conditional at-rules around a matching rule.
//  - !important and declaration priority: a declaration is read by position, not by priority.
//  - duplicate declarations or duplicate rules: only the last one in file order is compared.
//  - a later shorthand or other selector that changes the painted colour.
const root = postcss.parse(readFileSync(join(__dirname, '../../../app/globals.css'), 'utf8'))

function declarations(selector: string): Map<string, string> {
  const out = new Map<string, string>()
  let rules = 0
  root.walkRules(selector, (rule) => {
    if (rule.selector !== selector) return
    const parent = rule.parent
    const read = parent === root || (parent?.type === 'atrule' && (parent as postcss.AtRule).name === 'layer')
    if (!read) return
    rules++
    rule.each((node) => {
      if (node.type === 'decl') out.set(node.prop, node.value.trim())
    })
  })
  if (rules === 0) throw new Error(`no active ${selector} rule in globals.css`)
  return out
}

describe('source pin: custom property values in globals.css', () => {
  it('source pin: the :root rule declares --color-accent-on-tint #166534, --color-accent-text #15803d, --surface-overlay #f3f3ee', () => {
    const rootDecls = declarations(':root')
    expect(rootDecls.get('--color-accent-on-tint')).toBe('#166534')
    expect(rootDecls.get('--color-accent-text')?.replace(/\s*\/\*.*\*\/\s*$/, '')).toBe('#15803d')
    expect(rootDecls.get('--surface-overlay')).toBe('#f3f3ee')
  })

  it('source pin: the .light rule declares --surface-overlay #e4e4e7 (any case) and declares neither --color-accent-on-tint nor --color-accent-text', () => {
    const light = declarations('.light')
    expect(light.get('--surface-overlay')?.toLowerCase()).toBe('#e4e4e7')
    expect(light.has('--color-accent-on-tint')).toBe(false)
    expect(light.has('--color-accent-text')).toBe(false)
  })
})

describe('source pin: default primary Button class names', () => {
  it('source pin: buttonVariants({ variant: "primary" }) returns exactly the recorded set of class names', () => {
    const classes = buttonVariants({ variant: 'primary' }).split(/\s+/).filter(Boolean).sort()
    expect(classes).toEqual(
      [
        'inline-flex',
        'items-center',
        'justify-center',
        'rounded-sm',
        'font-medium',
        'focus:outline-hidden',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
        'bg-(--color-accent-10)',
        'border',
        'border-(--color-accent-border)',
        'text-(--color-accent-on-tint)',
        'hover:bg-(--color-accent-20)',
        'px-4',
        'py-2',
        'text-base',
        'w-auto',
      ].sort(),
    )
  })
})
