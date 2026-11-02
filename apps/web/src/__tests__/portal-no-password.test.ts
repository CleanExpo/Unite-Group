import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

// The portal promise is "You never give us your password." This test holds the code to it: no file in the portal
// route group or the portal components may ask an owner for a password or their login details.
// Test files are skipped (they hold the planted samples below); everything else under the two roots is read.

const SRC = join(__dirname, '..')
const ROOTS = [join(SRC, 'app', '(portal)'), join(SRC, 'components', 'portal')]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path)
    return /\.(tsx?|jsx?|mdx?|css|json)$/.test(name) ? [path] : []
  })
}

const SECRET = String.raw`(?:pass(?:word|wd|code|phrase)?|pwd|login[\s_-]*details|log[\s_-]*in[\s_-]*details|sign[\s_-]*in[\s_-]*details)`

const RULES: { name: string; pattern: RegExp }[] = [
  // type="password", type='password', type={'password'}, type: 'password'
  { name: 'password input type', pattern: /\btype\s*(?:=|:)\s*\{?\s*["'`]password["'`]/i },
  // name/id/htmlFor/autoComplete naming a password field
  { name: 'password field name or id', pattern: new RegExp(String.raw`\b(?:name|id|htmlFor|autoComplete)\s*(?:=|:)\s*\{?\s*["'\`][^"'\`]*(?:passw|passwd|pwd|current-password|new-password)`, 'i') },
  // the Input component's label prop, placeholders and accessible names asking for a secret
  { name: 'label or placeholder asking for a password', pattern: new RegExp(String.raw`\b(?:label|placeholder|aria-label|title)\s*(?:=|:)\s*\{?\s*["'\`][^"'\`]*${SECRET}`, 'i') },
  // <label ...>Your password</label> and the like
  { name: '<label> text asking for a password', pattern: new RegExp(String.raw`<label\b[^>]*>[^<]*${SECRET}`, 'i') },
  // a direct password sign-in call
  { name: 'password sign-in call', pattern: /signInWithPassword|updateUser\(\s*\{\s*password/ },
]

function findings(source: string): string[] {
  return RULES.filter((rule) => rule.pattern.test(source)).map((rule) => rule.name)
}

describe('the portal never asks for a password', () => {
  const scanned = ROOTS.flatMap(files)

  it('reads the real portal files (positive control on the scan itself)', () => {
    const names = scanned.map((f) => relative(SRC, f))
    expect(names).toContain(join('app', '(portal)', 'layout.tsx'))
    expect(names).toContain(join('app', '(portal)', 'portal', 'page.tsx'))
    expect(names).toContain(join('components', 'portal', 'portal-welcome.tsx'))
    expect(scanned.length).toBeGreaterThanOrEqual(8)
  })

  it.each(ROOTS.flatMap(files).map((f) => [relative(SRC, f), f]))('%s has no password field, name or prompt', (_name, file) => {
    expect(findings(readFileSync(file, 'utf8'))).toEqual([])
  })

  // Each planted sample must be caught, so a clean result above means the rules can actually fire.
  it.each([
    '<input type="password" />',
    "<Input type={'password'} />",
    "{ type: 'password' }",
    '<input name="password" />',
    '<input id="login-passwd" />',
    '<input name="pwd" />',
    '<Input autoComplete="current-password" />',
    '<Input label="Password" />',
    '<input placeholder="Enter your Google password" />',
    '<input aria-label="Your login details" />',
    '<label htmlFor="x">Your password</label>',
    '<label>Sign-in details</label>',
    'await supabase.auth.signInWithPassword({ email, password })',
  ])('catches a planted password request: %s', (sample) => {
    expect(findings(sample).length).toBeGreaterThan(0)
  })

  it('does not flag the promise itself', () => {
    expect(findings('<p>{NO_PASSWORD_LINE}</p>')).toEqual([])
    expect(findings("export const NO_PASSWORD_LINE = \"You never give us your password. You click Allow on Google's or Microsoft's own screen.\"")).toEqual([])
  })
})
