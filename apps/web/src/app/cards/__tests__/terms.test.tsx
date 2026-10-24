import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CardTermsPage, { metadata } from '../terms/page'

const SOURCE = readFileSync(join(__dirname, 'fixtures', 'card-order-terms-source.md'), 'utf8')

const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

const page = () => renderToStaticMarkup(createElement(CardTermsPage))

/** The text of every block in the terms article, in order, as a reader sees it. */
const blocks = (html: string) => {
  const article = /<article[^>]*>([\s\S]*)<\/article>/.exec(html)?.[1] ?? ''
  return [...article.matchAll(/<(h1|h2|p|li)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => decode(m[2].replace(/<[^>]+>/g, '')))
}

const PRIVACY_LINE = 'Read our privacy policy for the full detail.'

/** An independent reading of the approved source: drop the draft header line and the draft note, strip markers. */
const expectedBlocks = (abn: string) =>
  SOURCE.split('\n')
    .slice(1) // line 1 is the DRAFT header line
    .filter((l) => l.trim() !== '' && !l.startsWith('Draft dated 25 October 2026.'))
    .flatMap((l) => (l.startsWith('5. We keep order and enquiry records') ? [l, PRIVACY_LINE] : [l]))
    .map((l) => (l === PRIVACY_LINE ? l : /^#{1,2} /.test(l) ? l.replace(/^#{1,2} /, '') : l.replace(/^\d+\. /, '').replace(/^\*\*(.*)\*\*$/, '$1')))
    .map((l) => l.replace('(ABN 95 691 477 844)', `(${abn})`))

afterEach(() => vi.unstubAllEnvs())

describe('/cards/terms', () => {
  it('renders the approved text word for word, in order, with the verified ABN when COMPANY_ABN is unset', () => {
    vi.stubEnv('COMPANY_ABN', '')
    expect(blocks(page())).toEqual(expectedBlocks('ABN 95 691 477 844'))
  })

  it('shows the real ABN through companyAbnLabel() once it is set', () => {
    vi.stubEnv('COMPANY_ABN', '51 824 753 556')
    expect(blocks(page())).toEqual(expectedBlocks('ABN 51 824 753 556'))
    expect(decode(page())).toContain('Unite-Group Nexus Pty Ltd (ABN 51 824 753 556)')
  })

  it('carries the key clauses in the exact source wording', () => {
    vi.stubEnv('COMPANY_ABN', '')
    const text = blocks(page())
    for (const clause of [
      'After we send your first preview, we do not give refunds for change of mind.',
      'Cancel by email before we send your first preview and we refund you in full.',
      'Nothing in this section limits your rights under the Australian Consumer Law (section 12).',
      'Our services come with guarantees that cannot be excluded under the Australian Consumer Law.',
      'Nothing in these terms excludes, restricts or changes those rights or any other right that cannot lawfully be excluded. If anything here conflicts with that law, the law wins.',
      'We host your card for 12 months from the day it goes live. There is no monthly fee.',
      'We email you at least 30 days before hosting ends with the renewal price. Hosting does not renew unless you choose to pay.',
      'Your card is supplied by Unite-Group Nexus Pty Ltd (ABN 95 691 477 844) ("we", "us").',
    ]) {
      expect(text, clause).toContain(clause)
    }
  })

  it('has a single h1, fourteen numbered sections and the section 12 heading the refund clause points to', () => {
    const html = page()
    expect(html.match(/<h1/g)).toHaveLength(1)
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => decode(m[1]))
    expect(h2).toHaveLength(14)
    expect(h2[11]).toBe('12. Your rights under the Australian Consumer Law')
  })

  it('links the privacy policy from section 13 and nowhere else in the article', () => {
    const html = page()
    const s13 = html.slice(html.indexOf('13. Privacy'), html.indexOf('14. General'))
    expect(s13).toContain('<a href="/privacy-policy"')
    expect(html.match(/href="\/privacy-policy"/g)).toHaveLength(1)
  })

  it('leaves out the draft header line and every internal placeholder', () => {
    const html = decode(page())
    for (const banned of ['DRAFT', 'not legal advice', 'PHILL', 'Approved by Phill', '[', 'lawyer']) {
      expect(html, banned).not.toContain(banned)
    }
  })

  it('is plain: no Tailwind utility classes, no emoji, indexable with its own canonical', () => {
    const html = page()
    expect(html).not.toMatch(/class="[^"]*\b(?:flex|grid|text-|bg-|px-|py-|mt-|mb-|rounded)/)
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(metadata.alternates?.canonical).toBe('https://unite-group.in/cards/terms')
    expect(metadata.robots).toEqual({ index: true, follow: true })
  })
})
