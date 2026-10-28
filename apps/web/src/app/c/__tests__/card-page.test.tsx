import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPublishedCard = vi.fn()
vi.mock('@/lib/card/published', async (orig) => ({ ...(await orig<typeof import('@/lib/card/published')>()), getPublishedCard: (...a: unknown[]) => getPublishedCard(...a) }))
const notFound = vi.fn(() => { throw new Error('NEXT_NOT_FOUND') })
vi.mock('next/navigation', () => ({ notFound: () => notFound() }))

import CardPage, { generateMetadata } from '../[slug]/page'
import { GET } from '../[slug]/contact.vcf/route'

const card = {
  slug: 'sam', displayName: 'Sam Smith', roleTitle: 'Owner', businessName: 'Sam Co',
  email: 'sam@example.com', phone: '+61 400 000 001', serviceArea: 'Brisbane',
}
const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

beforeEach(() => { getPublishedCard.mockReset(); notFound.mockClear() })

describe('/c/[slug]', () => {
  it('the sample card shows the moving Constellation film', async () => {
    const sample = renderToStaticMarkup(await CardPage(params('sample')))
    expect(sample).toContain('data-sample-film')
    expect(sample).toContain('/cards/media/edition-constellation.mp4')
    expect(sample).toMatch(/<video[^>]*loop/)
    expect(sample).toContain('edition-constellation-poster.jpg')
  })

  it('renders name, role, Call, Email and Save contact in server HTML', async () => {
    getPublishedCard.mockResolvedValue(card)
    const html = renderToStaticMarkup(await CardPage(params('sam')))
    expect(html).toContain('Sam Smith')
    expect(html).not.toContain('<video')
    expect(html).toContain('Owner')
    expect(html).toContain('href="tel:+61400000001"')
    expect(html).toContain('href="mailto:sam@example.com"')
    expect(html).toContain('href="/c/sam/contact.vcf"')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<video')
  })

  it('shows no enquiry form unless CARD_ENQUIRY_RECEIPT_ENABLED=1, then shows it', async () => {
    getPublishedCard.mockResolvedValue(card)
    expect(renderToStaticMarkup(await CardPage(params('sam')))).not.toContain('<form')
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    try {
      expect(renderToStaticMarkup(await CardPage(params('sam')))).toContain('<form')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('v1.4 G3 the page hands the form the card\'s own phone and email as the fallback', async () => {
    getPublishedCard.mockResolvedValue(card)
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    try {
      const { CardView } = await import('../[slug]/card-view')
      const el = CardView({ card, enquiryOpen: true }) as { props: { children: unknown } }
      const form = JSON.stringify(el, (k, v) => (typeof v === 'function' ? v.name : v))
      expect(form).toContain('"fallback":{"phone":"+61 400 000 001","email":"sam@example.com"}')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('404s for an unknown, unpublished or invalid slug (same outcome)', async () => {
    getPublishedCard.mockResolvedValue(null)
    await expect(CardPage(params('nobody'))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(CardPage(params('../x'))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledTimes(2)
  })

  it('metadata names the card with a canonical url', async () => {
    getPublishedCard.mockResolvedValue(card)
    const m = await generateMetadata(params('sam'))
    expect(String(m.title)).toContain('Sam Smith')
    expect(m.alternates?.canonical).toBe('https://unite-group.in/c/sam')
  })

  it('metadata for a missing card is noindex', async () => {
    getPublishedCard.mockResolvedValue(null)
    expect((await generateMetadata(params('nobody'))).robots).toMatchObject({ index: false })
  })
})

describe('/c/[slug]/contact.vcf', () => {
  it('serves a text/vcard attachment with only the public fields', async () => {
    getPublishedCard.mockResolvedValue(card)
    const res = await GET(new Request('https://unite-group.in/c/sam/contact.vcf'), params('sam'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/vcard; charset=utf-8')
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="sam.vcf"')
    const body = await res.text()
    expect(body.startsWith('BEGIN:VCARD\r\nVERSION:4.0\r\n')).toBe(true)
    expect(body).toContain('FN:Sam Smith')
  })

  it('404 for unknown, unpublished or invalid slugs; 500 when the read fails', async () => {
    getPublishedCard.mockResolvedValue(null)
    expect((await GET(new Request('https://x/c/a/contact.vcf'), params('nobody'))).status).toBe(404)
    expect((await GET(new Request('https://x/c/a/contact.vcf'), params('../x'))).status).toBe(404)
    getPublishedCard.mockRejectedValue(new Error('db down'))
    expect((await GET(new Request('https://x/c/a/contact.vcf'), params('sam'))).status).toBe(500)
  })
})

describe('Margot line is founder-card only', () => {
  it('the served contact.vcf of a client card carries no Margot line, and its page has no Margot TEL', async () => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61400000000')
    try {
      getPublishedCard.mockResolvedValue(card)
      const vcf = await (await GET(new Request('https://unite-group.in/c/sam/contact.vcf'), params('sam'))).text()
      expect(vcf).not.toContain('+61400000000')
      expect(vcf).not.toContain('TYPE=WORK')
      expect(renderToStaticMarkup(await CardPage(params('sam')))).not.toContain('+61400000000')
      getPublishedCard.mockResolvedValue({ ...card, slug: 'phill-mcgurk' })
      const own = await (await GET(new Request('https://unite-group.in/c/phill-mcgurk/contact.vcf'), params('phill-mcgurk'))).text()
      expect(own).toContain('TEL;TYPE=WORK;VALUE=uri:tel:+61400000000')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
