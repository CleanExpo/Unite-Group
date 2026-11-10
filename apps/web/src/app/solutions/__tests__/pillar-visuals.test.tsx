import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PILLAR_SCREENS } from '@/public/pillar/pillar-visuals'
import { PILLARS } from '@/lib/public-site'

import ConversionPage from '../conversion/page'
import ExperiencePage from '../experience/page'
import IntelligencePage from '../intelligence/page'
import VisibilityPage from '../visibility/page'

const pages = { visibility: VisibilityPage, experience: ExperiencePage, conversion: ConversionPage, intelligence: IntelligencePage }

const SECTION_IDS = [
  'pillar-title',
  'pillar-story',
  'pillar-will',
  'pillar-intent',
  'pillar-problems',
  'pillar-process',
  'pillar-compare',
  'pillar-deliverables',
  'pillar-outcomes',
  'pillar-checks',
  'pillar-measures',
  'pillar-faq',
  'pillar-related',
  'pillar-sisters',
  'pillar-close',
]

describe('pillar pages are content-first', () => {
  it.each(PILLARS.map((p) => p.slug))('%s exposes at least eight substantive sections in main', (slug) => {
    const html = renderToStaticMarkup(pages[slug]())
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    const present = SECTION_IDS.filter((id) => main.includes(`id="${id}"`))
    expect(present.length, `sections found: ${present.join(', ')}`).toBeGreaterThanOrEqual(8)
    expect(main).not.toContain('Product preview')
    expect(main).not.toContain('data-film=')
  })

  it.each(PILLARS.map((p) => p.slug))('%s: no symbolic /landing/visuals picture', (slug) => {
    expect(decodeURIComponent(renderToStaticMarkup(pages[slug]()))).not.toContain('/landing/visuals/')
  })

  it('conversion names the live card offer without a showroom poster block', () => {
    const html = renderToStaticMarkup(ConversionPage())
    expect(html).toContain('id="pillar-live"')
    expect(html).toContain('href="/cards/order"')
    expect(html).not.toContain('edition-blueprint-poster')
  })
})

// Product screen assets stay declared for future promos and manifest checks.
describe('pillar screen assets stay valid', () => {
  it.each(PILLARS.flatMap((p) => Object.values(PILLAR_SCREENS[p.slug]).map((shot) => [shot.src, shot] as const)))(
    '%s exists at its declared size',
    (_src, shot) => {
      const buf = readFileSync(join(process.cwd(), 'public', shot.src))
      expect(buf.toString('ascii', 0, 4) + buf.toString('ascii', 8, 12)).toBe('RIFFWEBP')
      const chunk = buf.toString('ascii', 12, 16)
      const size =
        chunk === 'VP8 '
          ? [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff]
          : chunk === 'VP8X'
            ? [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1]
            : null
      expect(size, `unexpected webp chunk ${chunk}`).toEqual([shot.width, shot.height])
    },
  )
})
