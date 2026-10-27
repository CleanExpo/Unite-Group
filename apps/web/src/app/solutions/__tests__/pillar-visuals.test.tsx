import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PILLAR_SCREENS } from '@/components/public/pillar-visuals'
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
    const visual = PILLAR_SCREENS[slug].hero
    const hero = images(html).find((i) => i.src.includes(visual.src))
    expect(hero, `no <img> for ${slug} hero`).toBeDefined()
    expect(hero?.alt).not.toBe('')
    expect(hero?.alt).toBe(escapeAttr(visual.alt))
    expect(hero?.loading).not.toBe('lazy')
    // The hero picture sits in the first screen band inside main.
    expect(hero?.index).toBeGreaterThan(html.indexOf('<main'))
    expect(hero?.index).toBeLessThan(html.indexOf('id="pillar-will"'))

    // The same file must never appear twice. next/image puts the same file in src and srcset, so compare the file inside src only.
    const srcs = images(html).map((i) => i.src.match(/\/(?:landing|cards|solutions)\/[^&?\s]+\.(?:webp|jpg)/)?.[0] ?? i.src)
    expect(new Set(srcs).size).toBe(srcs.length)
  })

  it.each(PILLARS.map((p) => p.slug))('%s: no symbolic /landing/visuals picture, only real product screens', (slug) => {
    expect(decodeURIComponent(renderToStaticMarkup(pages[slug]()))).not.toContain('/landing/visuals/')
  })

  // The map's width and height must be the file's real size: next/image reserves space from them.
  it.each(PILLARS.flatMap((p) => Object.values(PILLAR_SCREENS[p.slug]).map((shot) => [shot.src, shot] as const)))('%s exists at its declared size', (_src, shot) => {
    const buf = readFileSync(join(process.cwd(), 'public', shot.src))
    expect(buf.toString('ascii', 0, 4) + buf.toString('ascii', 8, 12)).toBe('RIFFWEBP')
    const chunk = buf.toString('ascii', 12, 16)
    // Lossy VP8 stores 14-bit sizes after the start code; extended VP8X stores 24-bit sizes minus one.
    const size = chunk === 'VP8 ' ? [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff] : chunk === 'VP8X' ? [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1] : null
    expect(size, `unexpected webp chunk ${chunk}`).toEqual([shot.width, shot.height])
  })

  it('conversion shows the Blueprint card poster inside a link to /cards', () => {
    const html = renderToStaticMarkup(ConversionPage())
    const poster = images(html).find((i) => i.src.includes('/cards/media/edition-blueprint-poster.jpg'))
    expect(poster, 'no poster <img>').toBeDefined()
    // Says what the still shows (not the video's linework blurb in editions.ts).
    expect(poster?.alt).toBe('The Blueprint edition of the living business card: a cracked copper U glowing orange on navy, with the words Unite-Group Nexus beneath')
    const anchors = [...html.matchAll(/<a\b[^>]*href="\/cards"[^>]*>[\s\S]*?<\/a>/g)]
    expect(anchors.some((a) => a[0].includes('edition-blueprint-poster') || a[0].includes(encodeURIComponent('/cards/media/edition-blueprint-poster.jpg')))).toBe(true)
    expect(renderToStaticMarkup(VisibilityPage())).not.toContain('edition-blueprint-poster')
  })
})
