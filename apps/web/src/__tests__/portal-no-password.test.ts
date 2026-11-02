import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { NO_PASSWORD_LINE } from '@/components/portal/portal-copy'

// The portal promise is "You never give us your password." This test holds the code to it: no file in the portal
// route group or the portal components may ask an owner for a password or their login details.
//
// The rule is a ban, not a list of shapes. Any password wording anywhere in a portal source file fails, in an
// attribute, in rendered text, in a string or in a comment. The only exceptions are the exact approved promise line
// and the name of the constant that holds it. A matcher for known attribute shapes missed visible text such as
// "Enter your Google password" and computed input types (independent review, 02/11/2026), so the shapes are gone.
// Separately, an input type may only be a literal: `type={anything}` is refused, so a type cannot be assembled at run time.

const SRC = join(__dirname, '..')
const PORTAL_ROOTS = [join(SRC, 'app', '(portal)'), join(SRC, 'components', 'portal')]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path)
    return [path]
  })
}

// Words that ask for or name a secret sign-in value.
const SECRET_WORDS =
  /pass\s*-?\s*(?:word|wd|code|phrase)|\bpwd\b|\bpasswd\b|\b(?:log|sign)[\s_-]*(?:in|on)[\s_-]*(?:details|credentials)\b|\blogin[\s_-]*(?:details|credentials)\b|\bcredentials?\b|current-password|new-password/i

// The only places the word may appear: the approved line itself (as written in source, in any quote style) and the
// constant name that carries it to the page.
const ALLOWED = [NO_PASSWORD_LINE, NO_PASSWORD_LINE.replace(/'/g, "\\'"), NO_PASSWORD_LINE.replace(/'/g, '&apos;'), 'NO_PASSWORD_LINE']

/** Every reason this source would let the portal ask for a password. Empty means clean. */
function findings(source: string): string[] {
  let text = source
  for (const ok of ALLOWED) text = text.split(ok).join(' ')
  const out: string[] = []
  const word = text.match(SECRET_WORDS)
  if (word) out.push(`password wording: "${word[0]}"`)
  // type={...} lets a page build "password" from parts at run time; only literal types are allowed.
  if (/\btype\s*=\s*\{/.test(text)) out.push('computed input type')
  if (/\btype\s*:\s*(?!['"`])[A-Za-z_$]/.test(text)) out.push('computed input type (props object)')
  return out
}

function scanRoots(): { file: string; problems: string[] }[] {
  return PORTAL_ROOTS.flatMap(files).map((file) => ({ file, problems: findings(readFileSync(file, 'utf8')) }))
}

describe('the portal never asks for a password', () => {
  it('reads the real portal files (positive control on the scan itself)', () => {
    const names = PORTAL_ROOTS.flatMap(files).map((f) => relative(SRC, f))
    expect(names).toContain(join('app', '(portal)', 'layout.tsx'))
    expect(names).toContain(join('app', '(portal)', 'portal', 'page.tsx'))
    expect(names).toContain(join('components', 'portal', 'portal-welcome.tsx'))
    expect(names).toContain(join('components', 'portal', 'portal-copy.ts'))
    expect(names.length).toBeGreaterThanOrEqual(10)
  })

  it('finds nothing in the portal as it stands', () => {
    expect(scanRoots().filter((r) => r.problems.length > 0)).toEqual([])
  })

  it('still lets the approved promise line through, and only that line', () => {
    expect(findings(`export const NO_PASSWORD_LINE = "${NO_PASSWORD_LINE}"`)).toEqual([])
    expect(findings('<p>{NO_PASSWORD_LINE}</p>')).toEqual([])
    expect(findings('<p>You never give us your password.</p>').length).toBeGreaterThan(0)
  })

  // Each planted sample must be caught.
  it.each([
    '<input type="password" />',
    "<Input type={'password'} />",
    "const fieldKind = 'password'; return <input type={fieldKind} />",
    "const k = 'pass' + 'word'; return <input type={k} />",
    "createElement('input', { type: kind })",
    '<input name="pwd" />',
    '<input id="login-passwd" />',
    '<Input autoComplete="current-password" />',
    '<Input label="Password" />',
    '<p>Enter your Google password to connect your account.</p>',
    '<p>Type your passcode here</p>',
    '<label htmlFor="x">Your Microsoft pass word</label>',
    '<input aria-label="Your login details" />',
    '<p>Send us your sign-in details</p>',
    '<p>We need your credentials</p>',
    'await supabase.auth.signInWithPassword({ email, password })',
  ])('catches a planted password request: %s', (sample) => {
    expect(findings(sample).length).toBeGreaterThan(0)
  })

  // The same planted requests, written as real files inside each scanned root, must turn the real scan red.
  it.each(PORTAL_ROOTS.map((root) => [relative(SRC, root), root]))('fails the real file scan when a prompt is planted in %s', (_name, root) => {
    // A unique name per run, and 'wx' refuses to overwrite: a plant must never replace or delete a real file.
    const tag = `zz-plant-${process.pid}-${Date.now()}`
    const plants = [
      [`${tag}-text.tsx`, 'export const X = () => <p>Enter your Google password to connect your account.</p>\n'],
      [`${tag}-computed.tsx`, "const fieldKind = 'pass' + 'word'\nexport const Y = () => <input type={fieldKind} />\n"],
    ]
    for (const [name, body] of plants) {
      const path = join(root, name)
      writeFileSync(path, body, { flag: 'wx' })
      try {
        const hit = scanRoots().find((r) => r.file === path)
        expect(hit?.problems.length, `${name} in ${root}`).toBeGreaterThan(0)
      } finally {
        rmSync(path, { force: true })
      }
    }
    expect(scanRoots().filter((r) => r.problems.length > 0)).toEqual([])
  })
})
