import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { entityJsonLd } from '@/lib/entity'

import { BUSINESSES } from '../businesses'
import { Hero } from '../hero'
import { Story } from '../story'

const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const story = () => renderToStaticMarkup(<Story />)
const beats = (html: string) => html.split('<li class="').filter((p) => p.includes('data-beat="')).map((p) => p.slice(0, p.indexOf('</li>')))
const css = readFileSync(join(__dirname, '..', 'story.module.css'), 'utf8')

describe('hero story line', () => {
  it('says Every business. One system. in plain text, and drops the earlier line', () => {
    const html = renderToStaticMarkup(<Hero />)
    expect(strip(html)).toContain('Every business. One system.')
    expect(strip(html)).not.toMatch(/searches in|call out/i)
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
    expect(strip(list[4])).toMatch(/one CRM and operating system.*New businesses plug in/)
  })

  it('shows each frame labelled "n of 5" in static markup, so reduced motion and no script lose nothing', () => {
    const html = story()
    for (let i = 1; i <= 5; i++) expect(strip(html)).toContain(`${i} of 5`)
    expect(html).not.toMatch(/<script|\shidden[\s=>]/)
  })

  it('keeps the pillars Coming, with no numbers or testimonials', () => {
    const text = strip(story())
    expect(renderToStaticMarkup(<Story />).match(/>Coming</g)).toHaveLength(4)
    expect(text.replace(/\d of 5/g, '')).not.toMatch(/\d|testimonial/i)
  })

  it('uses no image to carry any text', () => {
    expect(story()).not.toMatch(/<img|<picture|<video|background-image|url\(/)
  })

  it('stops story motion under prefers-reduced-motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/)
    expect(css).toMatch(/@supports \(animation-timeline: view\(\)\)\s*\{\s*@media \(prefers-reduced-motion: no-preference\)/)
  })
})

describe('the business list', () => {
  it('is in Phill\'s order as real text, ending with "and the ones to come"', () => {
    const html = story()
    const list = html.slice(html.indexOf('data-businesses'), html.indexOf('</ul>', html.indexOf('data-businesses')))
    const names = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1]))
    expect(names).toEqual(['Synthex', 'CARSI', 'Disaster Recovery', 'NRPG', 'Trade Hall', 'RestoreAssist', 'CCW', 'and the ones to come'])
  })

  it('links only the names that have a verified live URL; the rest are plain text, never "#"', () => {
    const html = story()
    const list = html.slice(html.indexOf('data-businesses'), html.indexOf('</ul>', html.indexOf('data-businesses')))
    expect([...list.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([
      'https://www.synthex.social',
      'https://www.carsi.com.au',
      'https://www.disasterrecovery.com.au',
      'https://www.nrpg.business',
      'https://cleanexpo247-hall.vercel.app',
      'https://restoreassist.app',
      'https://ccwonline.com.au',
    ])
    expect(list).not.toContain('href="#"')
    expect(BUSINESSES.filter((b) => !b.url).map((b) => b.name)).toEqual(['and the ones to come'])
    expect(list).toContain('<li>and the ones to come</li>')
  })

  it('keeps Synthex out of the beat text, llms.txt and the JSON-LD (the list and its decorative chips only)', () => {
    const texts = [...story().matchAll(/<div class="[^"]*text[^"]*">([\s\S]*?)<\/div>/g)].map((m) => strip(m[1])).join(' ')
    expect(texts.length).toBeGreaterThan(200)
    expect(texts).not.toMatch(/synthex/i)
    expect(readFileSync(join(__dirname, '..', '..', '..', '..', 'public', 'llms.txt'), 'utf8')).not.toMatch(/synthex/i)
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/synthex/i)
  })
})
