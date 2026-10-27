import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { entityJsonLd } from '@/lib/entity'

import { ALSO, BUSINESSES, TILES } from '../businesses'
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
describe('the business tiles', () => {
  it("are the tiles, in Phill's order, as one list with real HTML names", () => {
    const html = story()
    expect(TILES.map((b) => b.name)).toEqual(['Synthex', 'Trade Hall'])
    const names = tiles(html).map((t) => strip(t.match(/class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ''))
    expect(names).toEqual(TILES.map((b) => b.name))
    expect(html).toContain('id="group"')
  })

  it('link only to the curl-200 URLs and never to "#"', () => {
    const list = tileList(story())
    expect([...list.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([
      'https://www.synthex.social',
      'https://cleanexpo247-hall.vercel.app',
    ])
    expect(list).not.toContain('href="#"')
    expect(list.match(/rel="noopener"/g)).toHaveLength(2)
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

  it('give no tag to Synthex (never described as a service) or Trade Hall', () => {
    expect(TILES.filter((b) => b.tag).map((b) => b.name)).toEqual([])
  })

  it('name the other businesses after the tiles as text', () => {
    const html = story()
    const at = html.indexOf('data-businesses-more')
    const more = html.slice(html.lastIndexOf('<', at), html.indexOf('</ul>', at))
    expect(strip(more)).toBe('CCW and the ones to come')
    expect(more).toContain('href="https://ccwonline.com.au"')
    expect(more).toContain('<li>and the ones to come</li>')
    expect(ALSO.map((b) => b.name)).toEqual(['CCW', 'and the ones to come'])
    expect(BUSINESSES).toHaveLength(4)
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

// Phill 26/10/2026 (UNI-3034): no CARSI, Disaster Recovery, NRPG, restoration or training content on public pages.
describe('no restoration-industry businesses', () => {
  it('names none of them in the list, the tiles or the rendered story', () => {
    const banned = /carsi|disaster|nrpg|restor|training|water damage|mould/i
    expect(JSON.stringify(BUSINESSES)).not.toMatch(banned)
    expect(strip(story())).not.toMatch(banned)
    expect(story()).not.toContain('data-dr-line')
  })
})
