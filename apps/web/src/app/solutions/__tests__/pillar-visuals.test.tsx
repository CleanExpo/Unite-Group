import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { VISUALS } from '@/components/public/visuals'
import { PILLARS } from '@/lib/public-site'

import ConversionPage from '../conversion/page'
import ExperiencePage from '../experience/page'
import IntelligencePage from '../intelligence/page'
import VisibilityPage from '../visibility/page'

const pages = { visibility: VisibilityPage, experience: ExperiencePage, conversion: ConversionPage, intelligence: IntelligencePage }

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Every <img> tag with its attributes parsed, src decoded so next/image URLs compare to the raw public path.
function images(html: string) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => {
    const tag = m[0]
    const attr = (name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
    const src = attr('src') ?? ''
    const decoded = decodeURIComponent(src)
    return { tag, src: decoded, alt: attr('alt') ?? '', loading: attr('loading'), index: m.index ?? 0 }
  })
}

describe('pillar pages show real pictures', () => {
  it.each(PILLARS.map((p) => p.slug))('%s: hero picture with alt text, eager, and no repeated picture', (slug) => {
    const html = renderToStaticMarkup(pages[slug]())
    const visual = VISUALS[slug]
    if (!visual) throw new Error(`No visual for ${slug}`)
    const hero = images(html).find((i) => i.src.includes(`/landing/visuals/${slug}-1280.webp`))
    expect(hero, `no <img> for ${slug} hero`).toBeDefined()
    expect(hero?.alt).not.toBe('')
    expect(hero?.alt).toBe(escapeAttr(visual.alt))
    expect(hero?.loading).not.toBe('lazy')
    // The hero picture is an <img> inside the article, not decoration elsewhere.
    expect(hero?.index).toBeGreaterThan(html.indexOf('<main'))

    // The same file must never appear twice. next/image puts the same file in src and srcset, so compare the file inside src only.
    const srcs = images(html).map((i) => i.src.match(/\/(?:landing|cards)\/[^&?\s]+\.(?:webp|jpg)/)?.[0] ?? i.src)
    expect(new Set(srcs).size).toBe(srcs.length)
  })

  it('conversion shows the Blueprint card poster inside a link to /cards', () => {
    const html = renderToStaticMarkup(ConversionPage())
    const poster = images(html).find((i) => i.src.includes('/cards/media/edition-blueprint-poster.jpg'))
    expect(poster, 'no poster <img>').toBeDefined()
    expect(poster?.alt.length).toBeGreaterThan(10)
    const anchors = [...html.matchAll(/<a\b[^>]*href="\/cards"[^>]*>[\s\S]*?<\/a>/g)]
    expect(anchors.some((a) => a[0].includes('edition-blueprint-poster') || a[0].includes(encodeURIComponent('/cards/media/edition-blueprint-poster.jpg')))).toBe(true)
    expect(renderToStaticMarkup(VisibilityPage())).not.toContain('edition-blueprint-poster')
  })
})
