import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThanksPage from '../page'
import { buildIntakeBody, checkLogoFile, orderRef } from '../intake-form'

const render = async (params: Record<string, string | string[] | undefined>) =>
  renderToStaticMarkup(await ThanksPage({ searchParams: Promise.resolve(params) }))

describe('orderRef', () => {
  it('takes ref, else the Stripe session_id placeholder value', () => {
    expect(orderRef({ ref: 'ref_abc123' })).toBe('ref_abc123')
    expect(orderRef({ session_id: 'cs_test_a1' })).toBe('cs_test_a1')
    expect(orderRef({ ref: 'ref_abc123', session_id: 'cs_test_a1' })).toBe('ref_abc123')
  })
  it.each([[{}], [{ ref: '' }], [{ ref: 'a b' }], [{ ref: 'a,b' }], [{ ref: ['x', 'y'] }], [{ ref: 'x'.repeat(201) }]])(
    'returns null for %j',
    (p) => expect(orderRef(p as never)).toBeNull(),
  )
})

describe('/cards/thanks', () => {
  it('thanks the buyer and shows the intake fields, carrying the reference', async () => {
    const html = await render({ ref: 'ref_abc123' })
    expect(html).toContain('Thank you')
    for (const name of ['name', 'business', 'email', 'where_met']) expect(html).toMatch(new RegExp(`<(input|textarea)[^>]*name="${name}"`))
    expect(html).toMatch(/<input[^>]*type="file"[^>]*name="logo"|<input[^>]*name="logo"[^>]*type="file"/)
    expect(html).toContain('ref_abc123')
  })

  it('shows no form, and says what to do, when there is no usable reference', async () => {
    const html = await render({})
    expect(html).not.toContain('<form')
    expect(html).toContain('payment receipt')
  })

  it('is not indexed', async () => {
    const mod = await import('../page')
    expect(mod.metadata.robots).toMatchObject({ index: false })
  })

  it('does not collect card details of any kind', async () => {
    const html = (await render({ ref: 'ref_abc123' })).toLowerCase()
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
    const body = buildIntakeBody(form, 'ref_abc123')
    expect(body).toEqual({ ref: 'ref_abc123', name: 'Sample Client', business: 'Sample Plumbing Co', email: 'sample@example.invalid', where_met: 'Expo' })
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
