import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import ThanksPage from '../page'
import { buildIntakeBody, checkLogoFile } from '../intake-form'
import { checkoutSessionId } from '../session-id'

const render = async (params: Record<string, string | string[] | undefined>) =>
  renderToStaticMarkup(await ThanksPage({ searchParams: Promise.resolve(params) }))

describe('checkoutSessionId', () => {
  it('takes the Stripe session_id placeholder value', () => {
    expect(checkoutSessionId({ session_id: 'cs_test_a1' })).toBe('cs_test_a1')
    expect(checkoutSessionId({ session_id: 'cs_live_a1B2' })).toBe('cs_live_a1B2')
  })
  it('ignores a ref label, even alongside a session id', () => {
    expect(checkoutSessionId({ ref: 'sample-plumbing-2610' })).toBeNull()
    expect(checkoutSessionId({ ref: 'sample-plumbing-2610', session_id: 'cs_test_a1' })).toBe('cs_test_a1')
  })
  it.each([[{}], [{ session_id: '' }], [{ session_id: 'sample-plumbing-2610' }], [{ session_id: 'cs_test_a b' }], [{ session_id: 'cs_test_a,b' }], [{ session_id: ['cs_test_a', 'cs_test_b'] }], [{ session_id: 'cs_test_' + 'x'.repeat(201) }]])(
    'returns null for %j',
    (p) => expect(checkoutSessionId(p as never)).toBeNull(),
  )
})

describe('/cards/thanks', () => {
  it('thanks the buyer and shows the intake fields, carrying the reference', async () => {
    const html = await render({ session_id: 'cs_test_a1' })
    expect(html).toContain('Thank you')
    for (const name of ['name', 'business', 'email', 'where_met']) expect(html).toMatch(new RegExp(`<(input|textarea)[^>]*name="${name}"`))
    expect(html).toMatch(/<input[^>]*type="file"[^>]*name="logo"|<input[^>]*name="logo"[^>]*type="file"/)
    expect(html).toContain('cs_test_a1')
  })

  it('shows no form, and says what to do, when there is no usable session id, including a readable ref', async () => {
    const html = await render({ ref: 'sample-plumbing-2610' })
    expect(html).not.toContain('<form')
    expect(html).toContain('payment receipt')
  })

  it('is not indexed', async () => {
    const mod = await import('../page')
    expect(mod.metadata.robots).toMatchObject({ index: false })
  })

  it('does not collect card details of any kind', async () => {
    const html = (await render({ session_id: 'cs_test_a1' })).toLowerCase()
    expect(html).not.toMatch(/card number|cvc|expiry/)
  })

  it('leaves the logo upload as an explicit, named TODO until a safe public upload path exists', () => {
    const src = readFileSync(join(__dirname, '..', 'intake-form.tsx'), 'utf8')
    expect(src).toContain('TODO(logo-upload)')
  })
})

describe('buildIntakeBody', () => {
  it('sends the typed fields and the reference, and never the file', () => {
    const form = new FormData()
    form.set('name', ' Sample Client ')
    form.set('business', 'Sample Plumbing Co')
    form.set('email', 'sample@example.invalid')
    form.set('where_met', 'Expo')
    form.set('logo', new File(['x'], 'logo.png', { type: 'image/png' }))
    const body = buildIntakeBody(form, 'cs_test_a1')
    expect(body).toEqual({ session_id: 'cs_test_a1', name: 'Sample Client', business: 'Sample Plumbing Co', email: 'sample@example.invalid', where_met: 'Expo' })
    expect(JSON.stringify(body)).not.toContain('logo')
  })
})

describe('checkLogoFile', () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], 'logo', { type })
  it('accepts a PNG, JPEG, WebP or SVG up to 5 MB, and no file at all', () => {
    for (const t of ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']) expect(checkLogoFile(file(t, 1000))).toBeNull()
    expect(checkLogoFile(null)).toBeNull()
    expect(checkLogoFile(file('', 0))).toBeNull() // an empty file input
  })
  it('refuses other types and anything over 5 MB, with a reason', () => {
    expect(checkLogoFile(file('application/pdf', 1000))).toMatch(/PNG|JPEG/)
    expect(checkLogoFile(file('image/png', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/)
  })
})

/** Whether a module's directive prologue (leading string-literal statements; comments are not statements) holds 'use client'. */
function isClientModule(src: string, name: string): boolean {
  const kind = name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(name, src, ts.ScriptTarget.Latest, true, kind)
  for (const st of sf.statements) {
    if (!ts.isExpressionStatement(st) || !ts.isStringLiteral(st.expression)) break
    if (st.expression.text === 'use client') return true
  }
  return false
}

/** Non-component values a Server Component imports from client modules: calling them on the server throws. */
function clientBoundaryViolations(pageSrc: string, readModule: (spec: string) => { src: string; name: string }): string[] {
  const sf = ts.createSourceFile('page.tsx', pageSrc, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const bad: string[] = []
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue
    const spec = st.moduleSpecifier.text
    if (!spec.startsWith('.')) continue
    const mod = readModule(spec)
    if (!isClientModule(mod.src, mod.name)) continue
    const clause = st.importClause
    if (!clause) continue
    if (clause.name && !/^[A-Z]/.test(clause.name.text)) bad.push(`${clause.name.text} from ${spec}`)
    const nb = clause.namedBindings
    if (nb && ts.isNamespaceImport(nb)) bad.push(`* as ${nb.name.text} from ${spec}`)
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) if (!/^[A-Z]/.test(el.name.text)) bad.push(`${el.name.text} from ${spec}`)
    }
  }
  return bad
}

describe('server/client boundary', () => {
  // A Server Component cannot call a function exported from a 'use client' module: Next throws at request time
  // and the page 500s (live /cards/thanks, 25/10/2026). Vitest imports both as plain modules, so check the source.
  const dir = join(__dirname, '..')
  const onDisk = (spec: string) => {
    if (spec.endsWith('.css')) return { src: '', name: 'style.ts' }
    const name = ['.tsx', '.ts'].map((e) => spec + e).find((f) => existsSync(join(dir, f)))
    if (!name) throw new Error(`cannot resolve page.tsx import ${spec}`)
    return { src: readFileSync(join(dir, name), 'utf8'), name }
  }

  it('page.tsx imports only components from client modules', () => {
    expect(clientBoundaryViolations(readFileSync(join(dir, 'page.tsx'), 'utf8'), onDisk)).toEqual([])
  })

  it('the helper the page calls is not in a client module, and the form is', () => {
    expect(isClientModule(onDisk('./session-id').src, 'session-id.ts')).toBe(false)
    expect(isClientModule(onDisk('./intake-form').src, 'intake-form.tsx')).toBe(true)
  })

  describe('negative controls: the guard fires on these', () => {
    const page = (imp: string) => `${imp}\nexport default function P() { return null }`
    it('a client directive after header comments is still seen', () => {
      const src = "// header\n// more header\n'use client'\nexport function helper() {}\n"
      expect(isClientModule(src, 'x.ts')).toBe(true)
      expect(clientBoundaryViolations(page("import { helper } from './x'"), () => ({ src, name: 'x.ts' }))).toEqual(['helper from ./x'])
    })
    it('a double-quoted directive and a double-quoted import are both seen', () => {
      const src = '/* c */\n"use client"\nexport function checkLogoFile() {}\n'
      expect(clientBoundaryViolations(page('import { checkLogoFile } from "./intake-form"'), () => ({ src, name: 'x.tsx' }))).toEqual([
        'checkLogoFile from ./intake-form',
      ])
    })
    it('default and namespace imports of client exports are flagged; components are allowed', () => {
      const src = "'use client'\nexport default function helper() {}\nexport function Widget() { return null }\n"
      const read = () => ({ src, name: 'x.tsx' })
      expect(clientBoundaryViolations(page("import helper from './x'"), read)).toEqual(['helper from ./x'])
      expect(clientBoundaryViolations(page("import * as m from './x'"), read)).toEqual(['* as m from ./x'])
      expect(clientBoundaryViolations(page("import { Widget } from './x'"), read)).toEqual([])
    })
    it('a non-client module is not flagged; a string after code is not a directive', () => {
      const plain = () => ({ src: 'export function helper() {}\n', name: 'x.ts' })
      expect(clientBoundaryViolations(page("import { helper } from './x'"), plain)).toEqual([])
      expect(isClientModule("import a from 'a'\n'use client'\n", 'x.ts')).toBe(false)
    })
  })
})
