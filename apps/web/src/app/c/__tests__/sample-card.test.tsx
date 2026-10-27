import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getPublishedCard = vi.fn()
vi.mock('@/lib/card/published', async (orig) => ({ ...(await orig<typeof import('@/lib/card/published')>()), getPublishedCard: (...a: unknown[]) => getPublishedCard(...a) }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))

import { isValidSlug } from '@/lib/card/slug'

import CardPage, { generateMetadata } from '../[slug]/page'
import { GET } from '../[slug]/contact.vcf/route'

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

beforeEach(() => getPublishedCard.mockReset())
afterEach(() => vi.unstubAllEnvs())

describe('/c/sample (J3 sample customer card)', () => {
  it('reserves the slug, so no owner can publish a real card at /c/sample', () => {
    expect(isValidSlug('sample')).toBe(false)
  })

  it('renders a labelled SAMPLE card without touching the database', async () => {
    const html = renderToStaticMarkup(await CardPage(params('sample')))
    expect(html).toContain('data-sample-card')
    expect(html).toContain('SAMPLE card.')
    expect(html).toContain('Sam Sample')
    expect(html).toContain('href="/c/sample/contact.vcf"')
    expect(html).toContain('href="/cards"')
    expect(getPublishedCard).not.toHaveBeenCalled()
  })

  it('never shows the enquiry form, even with enquiries switched on', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    expect(renderToStaticMarkup(await CardPage(params('sample')))).not.toContain('<form')
  })

  it('has no phone link and only a reserved .invalid email, so nobody real is called or emailed', async () => {
    const html = renderToStaticMarkup(await CardPage(params('sample')))
    expect(html).not.toContain('tel:')
    expect(html).toMatch(/mailto:[^"]+\.example\.invalid"/)
  })

  it('is noindex with no canonical', async () => {
    const meta = await generateMetadata(params('sample'))
    expect(meta.robots).toEqual({ index: false, follow: false })
    expect(meta.alternates).toBeUndefined()
    expect(getPublishedCard).not.toHaveBeenCalled()
  })

  it('serves a vCard that says SAMPLE', async () => {
    const res = await GET(new Request('https://unite-group.in/c/sample/contact.vcf'), params('sample'))
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('ORG:Sample Plumbing Co (SAMPLE)')
    expect(body).not.toContain('TEL')
    expect(res.headers.get('Content-Disposition')).toContain('sample.vcf')
  })

  it('leaves real cards unlabelled', async () => {
    getPublishedCard.mockResolvedValue({ slug: 'sam', displayName: 'Sam Smith', roleTitle: null, businessName: null, email: null, phone: null, serviceArea: null })
    expect(renderToStaticMarkup(await CardPage(params('sam')))).not.toContain('data-sample-card')
  })
})
