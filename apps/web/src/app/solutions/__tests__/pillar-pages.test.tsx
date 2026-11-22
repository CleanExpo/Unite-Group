import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PILLAR_EXTRA } from '@/lib/pillar-extra'
import { PILLARS } from '@/lib/public-site'
import { isPublicPath } from '@/proxy'

import ConversionPage, { metadata as conversionMeta } from '../conversion/page'
import ExperiencePage from '../experience/page'
import IntelligencePage from '../intelligence/page'
import VisibilityPage from '../visibility/page'

const pages = { visibility: VisibilityPage, experience: ExperiencePage, conversion: ConversionPage, intelligence: IntelligencePage }

// UNI-3320: written out by hand, never read back from the status map, so a flip in the map has to be made here too.
const EXPECTED_BADGE = { visibility: 'Coming', experience: 'Live', conversion: 'Live', intelligence: 'Coming' } as const
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
/** The hero badge: the first Live or Coming label on the page. */
const heroBadge = (html: string) => html.match(/>(Live|Coming)</)?.[1]

describe('pillar pages', () => {
  it.each(PILLARS.map((p) => p.slug))('%s: one job, Live or Coming, Unite Group first in the breadcrumb, never the word Home', (slug) => {
    const html = renderToStaticMarkup(pages[slug]())
    const crumbs = html.slice(html.indexOf('aria-label="Breadcrumb"'), html.indexOf('</ol>'))
    expect(crumbs).toMatch(/<li><a href="\/">Unite Group<\/a><\/li>/)
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(heroBadge(html)).toBe(EXPECTED_BADGE[slug])
    expect(crumbs.replace(/<[^>]*>/g, ' ')).not.toMatch(/\bHome\b/)
    expect(html).not.toMatch(/synthex/i)
    expect(html.match(/href="\/auth\/login"/g)).toHaveLength(1)
    expect(isPublicPath(`/solutions/${slug}`)).toBe(true)
  })

  it('only Conversion mentions the card on sale', () => {
    expect(renderToStaticMarkup(ConversionPage())).toContain('Living business cards are live today')
    const visibility = renderToStaticMarkup(VisibilityPage())
    expect(visibility).not.toContain('Living business cards are live today')
    expect(visibility).not.toContain('Available now')
    expect(conversionMeta.robots).toEqual({ index: true, follow: true })
  })
})

describe('a Live pillar page carries no not-yet-shipped wording (UNI-3320)', () => {
  it.each((Object.keys(EXPECTED_BADGE) as (keyof typeof EXPECTED_BADGE)[]).filter((slug) => EXPECTED_BADGE[slug] === 'Live'))(
    '%s',
    (slug) => {
      const text = strip(renderToStaticMarkup(pages[slug]()))
      expect(text).not.toMatch(/when this layer ships|on the roadmap|still coming|stack is coming|not on sale/i)
    },
  )
})

describe('the Experience pillar promises only what is delivered (UNI-3320)', () => {
  // Delivered today: the living card film, the private proof, the QR code and vCard, phone-first pages.
  // Not built: multi-page website tooling, a media manifest, performance notes, an accessibility pass.
  const html = renderToStaticMarkup(ExperiencePage())
  const text = strip(html)
  const source = JSON.stringify([PILLARS.find((p) => p.slug === 'experience'), PILLAR_EXTRA.experience])

  it('is Live, and its call to action orders a card', () => {
    expect(heroBadge(html)).toBe('Live')
    expect(html).toContain('href="/cards/order"')
  })

  it.each([/multi-page/i, /multipage/i, /media manifest/i, /manifested/i, /performance notes/i, /accessibility pass/i])(
    'makes no claim matching %s',
    (claim) => {
      expect(text).not.toMatch(claim)
      expect(source).not.toMatch(claim)
    },
  )

  it('names what is delivered: the film, the private proof, the QR code and the vCard', () => {
    for (const thing of [/film/i, /private proof/i, /QR/, /vCard/]) expect(text).toMatch(thing)
  })

  it('never names our own businesses', () => {
    expect(text).not.toMatch(/carsi|disaster recovery|nrpg|restoreassist|restoration|training/i)
  })
})
