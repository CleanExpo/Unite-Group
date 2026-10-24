import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PILLARS } from '@/lib/public-site'
import { isPublicPath } from '@/proxy'

import ConversionPage, { metadata as conversionMeta } from '../conversion/page'
import ExperiencePage from '../experience/page'
import IntelligencePage from '../intelligence/page'
import VisibilityPage from '../visibility/page'

const pages = { visibility: VisibilityPage, experience: ExperiencePage, conversion: ConversionPage, intelligence: IntelligencePage }

describe('pillar pages', () => {
  it.each(PILLARS.map((p) => p.slug))('%s: one job, Coming, Unite Group first in the breadcrumb, never the word Home', (slug) => {
    const html = renderToStaticMarkup(pages[slug]())
    const crumbs = html.slice(html.indexOf('aria-label="Breadcrumb"'), html.indexOf('</ol>'))
    expect(crumbs).toMatch(/<li><a href="\/">Unite Group<\/a><\/li>/)
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('>Coming<')
    expect(html.replace(/<[^>]*>/g, ' ')).not.toMatch(/\bHome\b/)
    expect(html).not.toMatch(/synthex/i)
    expect(html.match(/href="\/auth\/login"/g)).toHaveLength(1)
    expect(isPublicPath(`/solutions/${slug}`)).toBe(true)
  })

  it('only Conversion mentions the card on sale', () => {
    expect(renderToStaticMarkup(ConversionPage())).toContain('Available now')
    expect(renderToStaticMarkup(VisibilityPage())).not.toContain('Available now')
    expect(conversionMeta.robots).toEqual({ index: true, follow: true })
  })
})
