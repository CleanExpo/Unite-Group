import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { NO_PASSWORD_LINE } from '@/components/portal/portal-copy'

import { FORBIDDEN } from './portal-forbidden-words'

// The portal promise is "You never give us your password." This test holds the code to it: no file in the portal
// route group or the portal components may ask an owner for a password or their login details.
//
// What a visitor reads is not the same as the bytes in a source file. Two independent reviews (02/11/2026) got a
// password prompt past earlier versions of this scan: first with plain text the attribute matcher never looked at,
// then with an HTML entity (pass&#119;ord renders as "password"). So the scan now reads what would be shown:
//   1. it decodes HTML entities and JS escapes and drops invisible characters (repeatedly, for nested encodings);
//   2. it joins every letter in the file, so a word split by markup, JSX, quotes or "+" still reads as one word,
//      and it checks that stream backwards too;
//   3. portal source must be plain ASCII apart from a few typographic marks, so look-alike letters from other
//      alphabets cannot spell the word;
//   4. string-decoding helpers (atob, fromCharCode, ...) and computed input types are refused outright.
// The only exceptions are the exact approved promise line and the name of the constant that holds it.
// This guards against a careless or well-meant addition. It is not a proof against every possible obfuscation.

const SRC = join(__dirname, '..')
const PORTAL_ROOTS = [join(SRC, 'app', '(portal)'), join(SRC, 'components', 'portal')]
// Copy modules outside those folders whose words the portal pages render (Codex review 03/11/2026: the setup checklist
// lives in lib/portal/setup/items.ts and was outside the scan). They get the same strict rules.
const PORTAL_COPY_FILES = [join(SRC, 'lib', 'portal', 'setup', 'items.ts'), join(SRC, 'lib', 'portal', 'invites', 'outcomes.ts')]
// Everything else in lib/portal is logic (validators with regex escapes, URL parsing), so the strict escape rules do
// not fit it. What it can put on screen is its string literals; each one is checked for password wording instead.
const PORTAL_LIB = join(SRC, 'lib', 'portal')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path)
    return [path]
  })
}

// Dashes, curly quotes and the ellipsis are the only non-ASCII characters portal source may contain.
const TYPOGRAPHIC = /[–—‘’“”…]/g
const INVISIBLE = /[­͏؜ᅟᅠ᠎​-‏‪-‮⁠-⁤ㅤ﻿]/g
const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function codePoint(n: number): string {
  return Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''
}

/** The text a browser or the JS engine would produce from this source, as far as a static read can tell. */
function decode(source: string): string {
  let text = source
  for (let pass = 0; pass < 4; pass += 1) {
    const next = text
      .replace(/&#x([0-9a-f]+);?/gi, (_m, hex: string) => codePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_m, dec: string) => codePoint(Number(dec)))
      .replace(/&([a-z]+);/gi, (m, name: string) => (Object.hasOwn(NAMED, name) ? NAMED[name] : m))
      .replace(/\\u\{([0-9a-f]+)\}/gi, (_m, hex: string) => codePoint(parseInt(hex, 16)))
      .replace(/\\u([0-9a-f]{4})/gi, (_m, hex: string) => codePoint(parseInt(hex, 16)))
      .replace(/\\x([0-9a-f]{2})/gi, (_m, hex: string) => codePoint(parseInt(hex, 16)))
    if (next === text) break
    text = next
  }
  return text.normalize('NFKC').replace(INVISIBLE, '')
}


const ALLOWED = [NO_PASSWORD_LINE, 'NO_PASSWORD_LINE']

/** Every reason this source could let the portal ask for a password. Empty means clean. */
function findings(source: string): string[] {
  const out: string[] = []
  const decoded = decode(source)

  const foreign = source.replace(TYPOGRAPHIC, '').match(/[^\x00-\x7F]/) ?? decoded.replace(TYPOGRAPHIC, '').match(/[^\x00-\x7F]/)
  if (foreign) out.push(`non-ASCII character U+${foreign[0].codePointAt(0)?.toString(16).toUpperCase()}`)

  let text = decoded
  for (const ok of ALLOWED) text = text.split(ok).join(' ')
  // Two letter streams: the whole file, and the file with comments, markup tags and JSX braces taken out, so
  // a tag name between the two halves (pass<b></b>word) cannot add letters that break the word up.
  let shown = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/<[^<>]*>/g, '')
  for (let pass = 0; pass < 4; pass += 1) shown = shown.replace(/\{[^{}]*\}/g, '')
  const streams = [text, shown].map((s) => s.toLowerCase().replace(/[^a-z]/g, ''))
  for (const word of FORBIDDEN) {
    if (streams.some((s) => s.includes(word))) out.push(`password wording: ${word}`)
    else if (streams.some((s) => [...s].reverse().join('').includes(word))) out.push(`password wording, reversed: ${word}`)
  }
  if (/\bpwd\b/i.test(text)) out.push('password wording: pwd')

  // HTML has over 2,000 named entities, several of them invisible (&shy;, &ZeroWidthSpace;, &NoBreak;), and some
  // still render without the semicolon. Rather than decode every one, portal source may use only the six above.
  // (Codex review, 02/11/2026: pass&shy;word got past a decoder that knew only those six.)
  const entity = [source, decoded].join('\n').match(/(?<!&)&(?!&)([A-Za-z][A-Za-z0-9]*);?/g)?.find((m) => !Object.hasOwn(NAMED, m.replace(/^&|;$/g, '')) || !m.endsWith(';'))
  if (entity) out.push(`HTML entity not allowed: ${entity}`)

  // No escape mechanism of any kind, so the bytes in a portal file are the text it shows. Every layer has its own
  // escapes (JS w, CSS \77, numeric &#119;), and a decoder that knows some of them will miss the next one.
  // (Codex review, 02/11/2026: CSS content "pass\77 ord" got past a decoder that knew HTML and JS escapes.)
  if (source.includes('\\')) out.push('backslash escape')
  if (/&#/.test(source)) out.push('numeric HTML entity')
  // CSS generated text is not in the rendered HTML, so the rendered check cannot see it: no letters in content.
  const generated = source.match(/(?<![-\w])content\s*:[^;}]*/gi)?.find((m) => /[A-Za-z]/.test(m.replace(/^content\s*:/i, '')))
  if (generated) out.push(`CSS generated text: ${generated.trim()}`)

  if (/\b(?:atob|btoa|fromCharCode|fromCodePoint|decodeURI(?:Component)?|unescape|TextDecoder)\b|Buffer\s*\.\s*from/.test(text)) {
    out.push('string-decoding helper')
  }
  // type={...} lets a page build a password field at run time; only literal types are allowed.
  if (/\btype\s*=\s*\{/.test(text)) out.push('computed input type')
  if (/\btype\s*:\s*(?!['"`])[A-Za-z_$]/.test(text)) out.push('computed input type (props object)')
  return out
}

function scanRoots(roots: string[] = PORTAL_ROOTS): { file: string; problems: string[] }[] {
  return [...roots.flatMap(files), ...PORTAL_COPY_FILES].map((file) => ({ file, problems: findings(readFileSync(file, 'utf8')) }))
}

/** Quoted string literals in a source file: '...', "..." and template text. */
function literals(source: string): string[] {
  return source.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? []
}

/** Password wording in any string literal of a lib/portal module (tests and fixtures excluded). */
function libLiteralFindings(lib: string = PORTAL_LIB): { file: string; literal: string; word: string }[] {
  const libFiles = files(lib).filter((f) => !f.includes('__fixtures__') && /\.tsx?$/.test(f))
  return libFiles.flatMap((file) =>
    literals(readFileSync(file, 'utf8')).flatMap((literal) => {
      const letters = decode(literal).split(NO_PASSWORD_LINE).join(' ').toLowerCase().replace(/[^a-z]/g, '')
      return FORBIDDEN.filter((w) => letters.includes(w) || [...letters].reverse().join('').includes(w)).map((word) => ({ file, literal, word }))
    }),
  )
}

// Plants go into a throwaway copy of a scanned folder, never the real source tree: other suites walk src/app while this
// one runs, and a plant that appears and vanishes under them fails them (golive-grow, 03/11/2026: ENOENT on a plant).
function withCopy(root: string, run: (copy: string) => void): void {
  const copy = join(mkdtempSync(join(tmpdir(), 'portal-plant-')), 'root')
  cpSync(root, copy, { recursive: true })
  try {
    run(copy)
  } finally {
    rmSync(join(copy, '..'), { recursive: true, force: true })
  }
}

const ch = (code: number) => String.fromCodePoint(code)

// Each sample is a way of putting "password" on screen. Every one must be caught.
const SAMPLES: [string, string][] = [
  ['password input', '<input type="password" />'],
  ['literal type in braces', "<Input type={'password'} />"],
  ['computed type', "const fieldKind = 'password'; return <input type={fieldKind} />"],
  ['joined strings', "const k = 'pass' + 'word'; return <input type={k} />"],
  ['props object', "createElement('input', { type: kind })"],
  ['field name', '<input name="pwd" />'],
  ['field id', '<input id="login-passwd" />'],
  ['autocomplete', '<Input autoComplete="current-password" />'],
  ['label prop', '<Input label="Password" />'],
  ['visible text', '<p>Enter your Google password to connect your account.</p>'],
  ['passcode', '<p>Type your passcode here</p>'],
  ['split by a space', '<label htmlFor="x">Your Microsoft pass word</label>'],
  ['login details', '<input aria-label="Your login details" />'],
  ['sign-in details', '<p>Send us your sign-in details</p>'],
  ['credentials', '<p>We need your credentials</p>'],
  ['password sign-in call', 'await supabase.auth.signInWithPassword({ email, password })'],
  ['decimal entity', '<p>Enter your Google pass&#119;ord to continue.</p>'],
  ['hex entity', '<p>Enter your pass&#x77;ord</p>'],
  ['nested entity', '<p>Enter your pass&amp;#119;ord</p>'],
  ['entity look-alike letter', '<p>Enter your p&#1072;ssword</p>'],
  ['soft-hyphen entity', '<p>Enter your Google pass&shy;word to continue.</p>'],
  ['soft hyphen, no semicolon', '<p>Enter your pass&shyword</p>'],
  ['zero-width entity', '<p>Enter your pass&ZeroWidthSpace;word</p>'],
  ['joiner entity', '<p>Enter your pass&zwj;word</p>'],
  ['no-break entity', '<p>Enter your pass&NoBreak;word</p>'],
  ['prototype-name entity', '<p>pass&constructor;word</p>'],
  ['nested named entity', '<p>Enter your pass&amp;shy;word</p>'],
  ['JS escape',"const s = 'pass\\u0077ord'"],
  ['JS brace escape', "const s = 'pass\\u{77}ord'"],
  ['JS hex escape', "const s = 'pass\\x77ord'"],
  ['JSX split', "<p>pass{''}word</p>"],
  ['JSX comment split', '<p>pass{/* */}word</p>'],
  ['markup split', '<p>pass<b></b>word</p>'],
  ['reversed', "const s = 'drowssap'.split('').reverse().join('')"],
  ['base64', "const s = atob('cGFzc3dvcmQ=')"],
  ['char codes', 'const s = String.fromCharCode(112, 97, 115, 115)'],
  ['CSS content', ".x::before { content: 'Password' }"],
  ['CSS escape in content', '.x::after { content: "Enter your Google pass\\77 ord" }'],
  ['CSS escape in a selector', '.pass\\77 ord { color: red }'],
  ['CSS attr text', '.x::after { content: attr(data-hint) }'],
  ['backslash in a string', "const s = 'pass\\word'"],
  ['zero-width space', `<p>pass${ch(0x200b)}word</p>`],
  ['Cyrillic a', `<p>p${ch(0x430)}ssword</p>`],
  ['full-width letters', `<p>${'password'.split('').map((c) => ch(c.charCodeAt(0) + 0xfee0)).join('')}</p>`],
]

describe('the portal never asks for a password', () => {
  it('reads the real portal files (positive control on the scan itself)', () => {
    const names = PORTAL_ROOTS.flatMap(files).map((f) => relative(SRC, f))
    expect(names).toContain(join('app', '(portal)', 'portal', 'join', 'join-steps.tsx'))
    expect(names).toContain(join('app', '(portal)', 'portal', 'join', 'second-factor.tsx'))
    expect(names).toContain(join('app', '(portal)', 'portal', 'setup', 'setup-card.tsx'))
    expect(names).toContain(join('app', '(portal)', 'portal', 'changes', 'change-form.tsx'))
    expect(names).toContain(join('app', '(portal)', 'portal', 'page.tsx'))
    expect(names).toContain(join('components', 'portal', 'portal-welcome.tsx'))
    expect(names).toContain(join('components', 'portal', 'portal-copy.ts'))
    expect(names).toContain(join('components', 'portal', 'portal.module.css'))
    expect(names.length).toBeGreaterThanOrEqual(10)
  })

  it('finds nothing in the portal as it stands', () => {
    expect(scanRoots().filter((r) => r.problems.length > 0)).toEqual([])
  })

  it('lets the approved promise line through, and only that line', () => {
    expect(findings(`export const NO_PASSWORD_LINE = "${NO_PASSWORD_LINE}"`)).toEqual([])
    expect(findings('<p>{NO_PASSWORD_LINE}</p>')).toEqual([])
    expect(findings('<p>You never give us your password.</p>').length).toBeGreaterThan(0)
    expect(findings('/* —— Brand bar —— */ .a { justify-content: space-between } .b::after { content: "" }')).toEqual([])
    expect(findings('{a && b ? <p>Tom &amp; Sam&apos;s&nbsp;shop</p> : null}')).toEqual([])
  })

  it.each(SAMPLES)('catches %s', (_name, sample) => {
    expect(findings(sample).length).toBeGreaterThan(0)
  })

  // The same samples, written as real files inside each scanned folder, must turn the real file scan red.
  it.each(PORTAL_ROOTS.map((root) => [relative(SRC, root), root]))('fails the real file scan for every sample planted in a copy of %s', (_name, root) => {
    withCopy(root, (copy) => {
      const roots = PORTAL_ROOTS.map((r) => (r === root ? copy : r))
      expect(scanRoots(roots).filter((r) => r.problems.length > 0)).toEqual([])
      SAMPLES.forEach(([name, body], index) => {
        const path = join(copy, `zz-plant-${index}.${name.startsWith('CSS') ? 'css' : 'tsx'}`)
        writeFileSync(path, `${body}\n`, { flag: 'wx' })
        try {
          const hit = scanRoots(roots).find((r) => r.file === path)
          expect(hit?.problems.length, `${name} planted in ${root}`).toBeGreaterThan(0)
        } finally {
          rmSync(path, { force: true })
        }
      })
    })
  })

  it('reads the portal copy modules in lib/portal too (positive control)', () => {
    const scanned = scanRoots().map((r) => relative(SRC, r.file))
    expect(scanned).toContain(join('lib', 'portal', 'setup', 'items.ts'))
    expect(scanned).toContain(join('lib', 'portal', 'invites', 'outcomes.ts'))
  })

  it('finds no password wording in any string literal under lib/portal', () => {
    expect(libLiteralFindings()).toEqual([])
  })

  it('catches password wording planted in a lib/portal string literal, and leaves code names alone', () => {
    withCopy(PORTAL_LIB, (copy) => {
      expect(libLiteralFindings(copy)).toEqual([])
      const path = join(copy, 'setup', 'zz-plant.ts')
      writeFileSync(path, "export const STEP = 'Enter your password below.'\nconst ok = new URL('https://x').password\n", { flag: 'wx' })
      expect(libLiteralFindings(copy).map((f) => [relative(copy, f.file), f.word])).toEqual([[join('setup', 'zz-plant.ts'), 'password']])
    })
  })
})
