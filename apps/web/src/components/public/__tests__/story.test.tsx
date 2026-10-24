import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { entityJsonLd } from '@/lib/entity'

import { ALSO, BUSINESSES, DR_LINE, TILES } from '../businesses'
import { Hero } from '../hero'
import { Story } from '../story'

const PUBLIC = join(__dirname, '..', '..', '..', '..', 'public')
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const story = () => renderToStaticMarkup(<Story />)
const tileList = (html: string) => html.slice(html.indexOf('data-businesses'), html.indexOf('</ul>', html.indexOf('data-businesses')))
const tiles = (html: string) => tileList(html).split('<li ').slice(1).map((p) => p.slice(0, p.indexOf('</li>')))

describe('hero story line', () => {
  it('says Every business. One system. as the H1, and drops the earlier lines', () => {
    const html = renderToStaticMarkup(<Hero />)
    expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '')).toBe('Every business. One system.')
    expect(strip(html)).not.toMatch(/searches in|call out|makes video business cards/i)
  })
})

// Phill 25/10/2026: the five story beats and the shard-assembly scene are replaced by six dark glass tiles
// (home-redesign.test.tsx holds the page structure). What stays: the order, the 200-only links, the real logos,
// and the Synthex and honesty rules.
describe('the six business tiles', () => {
  it("are the six tiles, in Phill's order, as one list with real HTML names", () => {
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

  it('carry the real logo as a sized local file', () => {
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
    expect(TILES.filter((b) => !b.logo).map((b) => b.name)).toEqual([])
    expect(story()).not.toMatch(/<img[^>]*src="https?:/)
  })

  it('give each a one-line tag where a fact is known, and none to Synthex (never described as a service) or Trade Hall', () => {
    expect(TILES.filter((b) => b.tag).map((b) => b.name)).toEqual(['CARSI', 'Disaster Recovery', 'NRPG', 'RestoreAssist'])
    for (const b of TILES) if (b.tag) expect(b.tag.length, b.name).toBeLessThanOrEqual(40)
    const html = story()
    expect(html).toContain('The restoration company network.')
  })

  it('name the other businesses after the tiles as text', () => {
    const html = story()
    const at = html.indexOf('data-businesses-more')
    const more = html.slice(html.lastIndexOf('<', at), html.indexOf('</ul>', at))
    expect(strip(more)).toBe('CCW and the ones to come')
    expect(more).toContain('href="https://ccwonline.com.au"')
    expect(more).toContain('<li>and the ones to come</li>')
    expect(ALSO.map((b) => b.name)).toEqual(['CCW', 'and the ones to come'])
    expect(BUSINESSES).toHaveLength(8)
  })

  it('show everything in static markup, with no script, nothing hidden and no scroll scene', () => {
    const html = story()
    expect(html).not.toMatch(/<script|\shidden[\s=>]|data-shards/)
    expect(existsSync(join(__dirname, '..', 'shard-assembly.tsx'))).toBe(false)
  })

  it('keeps Synthex out of llms.txt and the JSON-LD (the tile only), and any present-tense operating claim out of the page', () => {
    const outside = story().replace(/<li class="[^"]*tileItem[^"]*"[^>]*data-tile[\s\S]*?<\/li>/g, '')
    expect(strip(outside)).not.toMatch(/synthex/i)
    expect(readFileSync(join(PUBLIC, 'llms.txt'), 'utf8')).not.toMatch(/synthex/i)
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/synthex/i)
    expect(strip(story())).not.toMatch(/lands and is run|sees every one of them|is caught and routed/)
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

