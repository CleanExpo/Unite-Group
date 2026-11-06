import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc,
    from: () => { throw new Error('a staff card must not read card_profiles') },
  }),
}))
vi.mock('@/lib/supabase/env-guard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/env-guard')>()),
  getSupabaseAnonConfig: () => ({ url: 'https://example.invalid', anonKey: 'test' }),
}))
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error('NOT_FOUND') }))
vi.mock('next/navigation', () => ({ notFound }))

import { isStaffSlug, isValidSlug } from '@/lib/card/slug'

import OwnerCardPage, { generateMetadata } from '../[slug]/page'
import { GET } from '../[slug]/contact.vcf/route'
import { isPublicPath } from '@/proxy'

const SLUG = 's-0123456789abcdef'
const params = { params: Promise.resolve({ slug: SLUG }) }
const row = {
  card_slug: SLUG,
  staff_name: 'Alex Staff',
  photo_url: 'https://cdn.example.invalid/alex.jpg',
  mobile: '0411 111 111',
  business_name: 'Harbour Plumbing',
  logo_url: 'https://cdn.example.invalid/logo.png',
  phone: '07 3000 0000',
  email: 'hello@harbour.example.invalid',
  website: 'https://harbour.example.invalid',
  address: '1 Queen Street',
  offer: 'First call-out free',
}
const render = async () => renderToStaticMarkup(await OwnerCardPage(params))

beforeEach(() => {
  rpc.mockReset()
  notFound.mockClear()
  rpc.mockResolvedValue({ data: [row], error: null })
})

describe('/c/<staff slug>', () => {
  it('shows the staff member with the business details read at render time', async () => {
    const html = await render()
    expect(rpc).toHaveBeenCalledWith('card_staff_public', { p_slug: SLUG })
    for (const text of ['Alex Staff', 'Harbour Plumbing', '1 Queen Street', 'First call-out free', 'https://harbour.example.invalid']) {
      expect(html).toContain(text)
    }
    expect(html).toContain('href="tel:0411111111"')
    expect(html).toContain('src="https://cdn.example.invalid/alex.jpg"')
    expect(html).toContain('src="https://cdn.example.invalid/logo.png"')
  })

  it('shows the new business name on the next render, with no copy kept on the card', async () => {
    expect(await render()).toContain('Harbour Plumbing')
    rpc.mockResolvedValue({ data: [{ ...row, business_name: 'Renamed Pty' }], error: null })
    const html = await render()
    expect(html).toContain('Renamed Pty')
    expect(html).not.toContain('Harbour Plumbing')
  })

  it('gives a deactivated or unset card the same not-found as an unknown one', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    await expect(render()).rejects.toThrow('NOT_FOUND')
  })

  it('surfaces a failed read instead of showing not-found', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'down' } })
    await expect(render()).rejects.toThrow('staff card read failed')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('is never indexed: its words are changed by a customer link with no review', async () => {
    const meta = await generateMetadata(params)
    expect(meta.robots).toEqual({ index: false, follow: false })
    expect(String(meta.alternates?.canonical)).toBe(`https://unite-group.in/c/${SLUG}`)
  })

  it('has no enquiry form: enquiries are keyed on card_owners, which a staff card is not in', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    expect(await render()).not.toContain('<form')
    vi.unstubAllEnvs()
  })

  it('serves a contact file with the staff member and the business, and 404s once deactivated', async () => {
    const ok = await GET(new Request('https://unite-group.in/x'), params)
    expect(ok.status).toBe(200)
    const vcf = await ok.text()
    expect(vcf).toContain('FN:Alex Staff')
    expect(vcf).toContain('ORG:Harbour Plumbing')
    rpc.mockResolvedValue({ data: [], error: null })
    expect((await GET(new Request('https://unite-group.in/x'), params)).status).toBe(404)
  })
})

describe('staff slugs and public paths', () => {
  it.each([[SLUG, true], ['s-0123', false], ['s-0123456789ABCDEF', false], ['phill-mcgurk', false], ['s-0123456789abcdefg', false]])('isStaffSlug(%s) is %s', (slug, want) => {
    expect(isStaffSlug(slug)).toBe(want)
  })

  it('staff slugs fit the existing public card path', () => {
    expect(isValidSlug(SLUG)).toBe(true)
    expect(isPublicPath(`/c/${SLUG}`)).toBe(true)
  })

  it('opens the manage page and its route exactly, and not their siblings', () => {
    expect(isPublicPath('/cards/manage')).toBe(true)
    expect(isPublicPath('/api/cards/manage')).toBe(true)
    expect(isPublicPath('/cards/manage/x')).toBe(false)
    expect(isPublicPath('/api/cards/manage/x')).toBe(false)
  })
})
