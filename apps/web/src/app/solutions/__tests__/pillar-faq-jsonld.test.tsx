import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PILLAR_EXTRA } from '@/lib/pillar-extra'
import { PILLARS } from '@/lib/public-site'

import ConversionPage from '../conversion/page'
import ExperiencePage from '../experience/page'
import IntelligencePage from '../intelligence/page'
import VisibilityPage from '../visibility/page'

const pages = { visibility: VisibilityPage, experience: ExperiencePage, conversion: ConversionPage, intelligence: IntelligencePage }

const OPEN = '<script type="application/ld+json">'

function decode(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
}

function faqBlocks(html: string): Array<Record<string, any>> {
  const blocks: Array<Record<string, any>> = []
  let from = 0
  for (;;) {
    const at = html.indexOf(OPEN, from)
    if (at === -1) return blocks
    const start = at + OPEN.length
    const end = html.indexOf('</script>', start)
    blocks.push(JSON.parse(html.slice(start, end)))
    from = end
  }
}

// The schema may only say what is true today. Future-tense promises and roadmap talk are not facts.
const FUTURE_CLAIM = /\b(coming|roadmap|when it ships|will include|is still on)\b/i

describe('pillar FAQ JSON-LD', () => {
  it.each(PILLARS.map((p) => p.slug))('%s: FAQPage matches the visible FAQ word for word', (slug) => {
    const html = renderToStaticMarkup(pages[slug]())
    const faq = faqBlocks(html).filter((b) => b['@type'] === 'FAQPage')
    expect(faq).toHaveLength(1)

    const faqSection = html.slice(html.indexOf('id="pillar-faq"'), html.indexOf('</section>', html.indexOf('id="pillar-faq"')))
    const visible = [...faqSection.matchAll(/<summary>(.*?)<\/summary><p>(.*?)<\/p>/g)].map((m) => ({ q: decode(m[1]), a: decode(m[2]) }))
    const schema = faq[0].mainEntity.map((e: any) => ({ q: e.name, a: e.acceptedAnswer.text }))
    expect(visible.length).toBeGreaterThan(0)
    expect(schema).toEqual(visible)
  })

  it.each(PILLARS.map((p) => p.slug))('%s: no FAQ answer makes a future-tense claim', (slug) => {
    const pillar = PILLARS.find((p) => p.slug === slug)!
    for (const item of [...pillar.faq, ...PILLAR_EXTRA[slug].extraFaq]) {
      expect(`${item.q} :: ${item.a}`).not.toMatch(FUTURE_CLAIM)
    }
  })

  it('escapes markup characters so an answer can never close the script tag', () => {
    for (const slug of Object.keys(pages) as Array<keyof typeof pages>) {
      const html = renderToStaticMarkup(pages[slug]())
      const at = html.indexOf(OPEN)
      const body = html.slice(at + OPEN.length, html.indexOf('</script>', at))
      expect(body).not.toContain('<')
    }
  })
})
