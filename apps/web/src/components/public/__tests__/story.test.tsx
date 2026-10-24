import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { entityJsonLd } from '@/lib/entity'

import { ALSO, BUSINESSES, DR_LINE, TILES } from '../businesses'
import { Hero } from '../hero'
import { BEATS, Story } from '../story'

const PUBLIC = join(__dirname, '..', '..', '..', '..', 'public')
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const story = () => renderToStaticMarkup(<Story />)
const beats = (html: string) => html.split('<li class="').filter((p) => p.includes('data-beat="')).map((p) => p.slice(0, p.indexOf('</li>')))
const css = readFileSync(join(__dirname, '..', 'story.module.css'), 'utf8')
const tileList = (html: string) => html.slice(html.indexOf('data-businesses'), html.indexOf('</ul>', html.indexOf('data-businesses')))
const tiles = (html: string) => tileList(html).split('<li ').slice(1).map((p) => p.slice(0, p.indexOf('</li>')))

describe('hero story line', () => {
  it('says Every business. One system. as the H1, and drops the earlier lines', () => {
    const html = renderToStaticMarkup(<Hero />)
    expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '')).toBe('Every business. One system.')
    expect(strip(html)).not.toMatch(/searches in|call out|makes video business cards/i)
  })
})

describe('story beats', () => {
  it('has five beats in order, each with text and a link to its pillar page', () => {
    const list = beats(story())
    expect(list).toHaveLength(5)
    const expected = [
      ['businesses', '/solutions/visibility', 'Many businesses'],
      ['visibility', '/solutions/visibility', 'Visibility'],
      ['experience', '/solutions/experience', 'Experience'],
      ['conversion', '/solutions/conversion', 'Conversion'],
      ['intelligence', '/solutions/intelligence', 'Intelligence'],
    ]
    expected.forEach(([key, href, label], i) => {
      expect(list[i]).toContain(`data-beat="${key}"`)
      expect(list[i]).toContain(`href="${href}"`)
      expect(strip(list[i])).toContain(label)
      expect(strip(list[i]).length).toBeGreaterThan(60)
    })
    expect(strip(list[4])).toMatch(/CRM and operating system we are building for the whole group.*new businesses to plug in/)
  })

  it('shows each beat labelled "n of 5" in static markup, so reduced motion and no script lose nothing', () => {
    const html = story()
    for (let i = 1; i <= 5; i++) expect(strip(html)).toContain(`${i} of 5`)
    expect(html).not.toMatch(/<script|\shidden[\s=>]/)
  })

  it('keeps the pillars Coming, with no numbers or testimonials', () => {
    const html = story()
    expect(html.match(/>Coming</g)).toHaveLength(4)
    expect(strip(html).replace(/\d of 5/g, '')).not.toMatch(/\d|testimonial/i)
  })

  // Codex 25/10: the group CRM is not built yet, so beats 2 to 5 must say what we are building, never claim it runs today
  it('frames every pillar beat as what we are building, with no present-tense operating claim', () => {
    for (const b of BEATS.slice(1)) expect(b.body, b.key).toMatch(/we are building/)
    expect(strip(story())).not.toMatch(/lands and is run|sees every one of them|is caught and routed/)
  })

  it('draws no lens: the line art that stood behind the beats is gone', () => {
    expect(story()).not.toMatch(/<svg[^>]*class="[^"]*lens|data-beat-visual/)
  })
})

describe('the six shards of the U', () => {
  it('are the six tiles, in Phill\'s order, as one list with real HTML names', () => {
    const html = story()
    expect(TILES.map((b) => b.name)).toEqual(['Synthex', 'CARSI', 'Disaster Recovery', 'NRPG', 'Trade Hall', 'RestoreAssist'])
    const names = tiles(html).map((t) => strip(t.match(/class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ''))
    expect(names).toEqual(TILES.map((b) => b.name))
    expect(html).toContain('id="group"')
  })

  it('link only to the curl-200 URLs and never to "#"', () => {
    const list = tileList(story())
    expect([...list.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([
      'https://www.synthex.social',
      'https://www.carsi.com.au',
      'https://www.disasterrecovery.com.au',
      'https://www.nrpg.business',
      'https://cleanexpo247-hall.vercel.app',
      'https://restoreassist.app',
    ])
    expect(list).not.toContain('href="#"')
    expect(list.match(/rel="noopener"/g)).toHaveLength(6)
  })

  it('carry the real logo as a sized local webp, or a text wordmark where the repo has none', () => {
    const t = tiles(story())
    t.forEach((tile, i) => {
      const b = TILES[i]
      if (b.logo) {
        const img = tile.match(/<img[^>]*>/)?.[0] ?? ''
        expect(img, b.name).toContain(`src="${b.logo}"`)
        expect(img).toMatch(/width="\d+"/)
        expect(img).toMatch(/height="\d+"/)
        expect(img).toContain('alt=""')
        expect(existsSync(join(PUBLIC, b.logo)), b.logo).toBe(true)
      } else {
        expect(tile, b.name).not.toContain('<img')
        expect(tile).toContain('data-wordmark')
      }
    })
    expect(TILES.filter((b) => !b.logo).map((b) => b.name)).toEqual(['Trade Hall'])
    expect(story()).not.toMatch(/<img[^>]*src="https?:/)
  })

  it('sit round a Nexus focal point, with the other names after them as text', () => {
    const html = story()
    expect(html).toMatch(/data-nexus[^>]*>[\s\S]*?Nexus/)
    const at = html.indexOf('data-businesses-more')
    const more = html.slice(html.lastIndexOf('<', at), html.indexOf('</ul>', at))
    expect(strip(more)).toBe('CCW and the ones to come')
    expect(more).toContain('href="https://ccwonline.com.au"')
    expect(more).toContain('<li>and the ones to come</li>')
    expect(ALSO.map((b) => b.name)).toEqual(['CCW', 'and the ones to come'])
    expect(BUSINESSES).toHaveLength(8)
  })

  it('show the assembled U in static markup, with nothing hidden and no script', () => {
    const html = story()
    expect(html).toContain('data-shards="assembled"')
    expect(html).not.toMatch(/<script|\shidden[\s=>]/)
  })

  it('assemble on scroll only where the browser can and the visitor allows it, with a fallback and a still U under reduced motion', () => {
    expect(css).toMatch(/@supports \(animation-timeline: view\(\)\)\s*\{\s*@media \(prefers-reduced-motion: no-preference\)/)
    expect(css).toMatch(/animation-timeline:\s*(view\(\)|--)/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/)
    expect(css).toMatch(/\[data-shards='apart'\]/)
    const observer = readFileSync(join(__dirname, '..', 'shard-assembly.tsx'), 'utf8')
    expect(observer).toMatch(/IntersectionObserver/)
    expect(observer).toMatch(/animation-timeline/)
    expect(observer).toMatch(/prefers-reduced-motion/)
  })

  it('keeps Synthex out of the beat text, llms.txt and the JSON-LD (the tiles only)', () => {
    const texts = [...story().matchAll(/<div class="[^"]*text[^"]*">([\s\S]*?)<\/div>/g)].map((m) => strip(m[1])).join(' ')
    expect(texts.length).toBeGreaterThan(200)
    expect(texts).not.toMatch(/synthex/i)
    expect(readFileSync(join(PUBLIC, 'llms.txt'), 'utf8')).not.toMatch(/synthex/i)
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/synthex/i)
  })
})

// Phill 25/10/2026: the one approved description of Disaster Recovery. One source of truth, no certification or hours claims.
describe('the Disaster Recovery line', () => {
  const SENTENCE =
    'professional water damage restoration and mould specialists connecting homes and businesses across Australia and New Zealand with professional restoration companies through the NRPG network'

  it('is the approved sentence, defined once and used from that one place', () => {
    expect(DR_LINE).toBe(SENTENCE)
    const dr = BUSINESSES.find((b) => b.name === 'Disaster Recovery')!
    expect(dr.line).toBe(SENTENCE)
    expect(BUSINESSES.filter((b) => b.line).map((b) => b.name)).toEqual(['Disaster Recovery'])
    const html = story()
    expect(strip(html).split(SENTENCE).length - 1).toBe(1)
  })

  it('is readable at every width: one visible caption under the U, never hidden by CSS', () => {
    const html = story()
    const m = html.match(/<p[^>]*data-dr-line[^>]*>([\s\S]*?)<\/p>/)
    expect(m, 'caption paragraph').not.toBeNull()
    expect(strip(m![1])).toContain(SENTENCE)
    const css = readFileSync(join(__dirname, '..', 'story.module.css'), 'utf8')
    expect(css).not.toMatch(/\.line\s*\{[^}]*display:\s*none/)
    expect(css).not.toMatch(/\.drline\s*\{[^}]*display:\s*none/)
  })

  it('makes no 24/7, certified or IICRC claim anywhere a public file names Disaster Recovery', () => {
    const banned = /24\/7|24 hours|certified|IICRC/i
    expect(DR_LINE).not.toMatch(banned)
    expect(strip(story())).not.toMatch(banned)
    const dir = join(__dirname, '..')
    for (const f of ['businesses.ts', 'story.tsx', 'answers.tsx', 'hero.tsx', 'public-home.tsx']) {
      const src = readFileSync(join(dir, f), 'utf8')
      for (const line of src.split('\n').filter((l) => /disaster recovery/i.test(l))) expect(line, `${f}: ${line}`).not.toMatch(banned)
    }
    const llms = readFileSync(join(PUBLIC, 'llms.txt'), 'utf8')
    for (const line of llms.split('\n').filter((l) => /disaster recovery/i.test(l))) expect(line).not.toMatch(banned)
    expect(JSON.stringify(entityJsonLd())).not.toMatch(banned)
  })
})

