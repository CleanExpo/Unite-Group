import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

/**
 * Reads the page's styling code and lists every styled state, so the gate can fail when one
 * of them is never screenshotted.
 *
 * - *.module.css: every selector carrying a state pseudo-class or a data-/aria- attribute.
 *   A pseudo-class this file does not know fails closed as "unclassified".
 * - *.tsx: a Tailwind state variant (hover:, focus:, peer-checked: ...) fails outright, because
 *   its rule cannot be traced back to a capture. Visual pages use CSS Modules (house style).
 */

export const STATE_PSEUDO = new Set([
  'hover', 'focus', 'focus-visible', 'focus-within', 'active', 'checked', 'disabled', 'enabled',
  'invalid', 'user-invalid', 'valid', 'user-valid', 'indeterminate', 'placeholder-shown',
  'target', 'visited', 'open', 'popover-open', 'autofill', 'read-only', 'read-write', 'required', 'optional',
])

const STRUCTURAL_PSEUDO = new Set([
  'root', 'not', 'is', 'where', 'has', 'first-child', 'last-child', 'only-child', 'nth-child',
  'nth-last-child', 'first-of-type', 'last-of-type', 'nth-of-type', 'only-of-type', 'empty',
  // CSS Modules scoping, not a state: :global(div) names an unhashed element or class.
  'global',
])

const TAILWIND_STATE = /(?:^|[\s"'`{])((?:hover|focus|focus-visible|focus-within|active|checked|disabled|enabled|invalid|user-invalid|open|visited|target|placeholder-shown|(?:peer|group)(?:-[a-z-]+)?|aria-[a-z-]+|data-[a-z-]+)):[^\s"'`}]+/g

export type StyledState = { key: string; file: string; line: number; selector: string; states: string[] }
export type Problem = { file: string; line: number; message: string }

/** One canonical spelling for a selector, shared by the source scan and the browser record. */
export function canonical(selector: string): string {
  return selector.replace(/\s+/g, '').replace(/'/g, '"')
}

/** Split a selector list on top-level commas only. */
export function splitSelectors(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** The state markers in one selector: pseudo-classes and data-/aria- attributes. */
export function statesIn(selector: string): { states: string[]; unknown: string[] } {
  const states: string[] = []
  const unknown: string[] = []
  for (const m of selector.matchAll(/(?<!:):(?!:)([a-z-]+)/g)) {
    const name = m[1]
    if (STATE_PSEUDO.has(name)) states.push(name)
    else if (!STRUCTURAL_PSEUDO.has(name)) unknown.push(name)
  }
  for (const m of selector.matchAll(/\[((?:data|aria)-[a-z-]+)[^\]]*\]/g)) states.push(m[0])
  return { states, unknown }
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(path)
    return [path]
  })
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length
}

/** Scan the source folders. Returns every styled state and every problem that must fail the gate. */
export function scanStyles(root: string, folders: string[]): { styled: StyledState[]; problems: Problem[] } {
  const styled: StyledState[] = []
  const problems: Problem[] = []
  for (const folder of folders) {
    for (const path of walk(join(root, folder))) {
      const file = relative(root, path)
      const text = readFileSync(path, 'utf8')
      if (path.endsWith('.module.css')) {
        const stem = basename(path, '.module.css')
        const css = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
        for (const m of css.matchAll(/([^{}@;]+)\{/g)) {
          const line = lineAt(css, m.index! + (m[1].length - m[1].trimStart().length))
          for (const part of splitSelectors(m[1])) {
            const { states, unknown } = statesIn(part)
            for (const u of unknown) problems.push({ file, line, message: `unclassified pseudo-class :${u} in "${part}"` })
            if (states.length) styled.push({ key: `${stem}|${canonical(part)}`, file, line, selector: part, states })
          }
        }
      } else if (path.endsWith('.css')) {
        problems.push({ file, line: 1, message: 'plain .css under a visual page; use a .module.css so its states are traced' })
      } else if (/\.(tsx|ts|jsx|js)$/.test(path)) {
        for (const m of text.matchAll(TAILWIND_STATE)) {
          if (m[0].includes('//')) continue
          problems.push({
            file,
            line: lineAt(text, m.index!),
            message: `Tailwind state variant "${m[0].trim()}" cannot be traced to a screenshot; style it in the CSS module`,
          })
        }
      }
    }
  }
  return { styled, problems }
}

/**
 * Turn a compiled CSS Modules selector back into the source key. Next (webpack build) names
 * classes `<file>_<local>__<5-char hash>`, e.g. order_sticky__Buuo9 (read from .next/static/css,
 * 24/10/2026); any class not in that shape belongs to someone else.
 */
export function sourceKey(compiled: string): string | null {
  let stem: string | null = null
  const local = compiled.replace(/\.([A-Za-z0-9_-]+)/g, (whole, cls: string) => {
    const m = /^([A-Za-z0-9-]+)_([A-Za-z][A-Za-z0-9]*)__[A-Za-z0-9_-]{5}$/.exec(cls)
    if (!m) return whole
    if (stem && stem !== m[1]) stem = '*'
    else stem = m[1]
    return `.${m[2]}`
  })
  if (!stem || stem === '*') return null
  return `${stem}|${canonical(local)}`
}
