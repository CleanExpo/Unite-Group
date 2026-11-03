import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'

import { metadata as loginMeta } from '../(auth)/auth/login/layout'
import robots from '../robots'
import sitemap from '../sitemap'

const llms = readFileSync(join(__dirname, '..', '..', '..', 'public', 'llms.txt'), 'utf8')

describe('sitemap (AC-7)', () => {
  it('lists the home, cards, order, terms, ten-clips, get-a-website, four pillars and the two legal pages, and nothing private (not /grow: noindex, D3)', () => {
    const paths = sitemap().map((e) => new URL(e.url).pathname)
    expect(paths).toEqual([
      '/', '/cards', '/cards/order', '/cards/terms', '/video/ten-clips', '/get-a-website', '/pricing', '/signatures',
      '/solutions/visibility', '/solutions/experience', '/solutions/conversion', '/solutions/intelligence',
      '/privacy-policy', '/terms-of-service',
    ])
    expect(paths.some((p) => /^\/(founder|api|docs|auth)/.test(p))).toBe(false)
    expect(sitemap().every((e) => e.url.startsWith('https://unite-group.in'))).toBe(true)
  })
})

describe('robots (AC-7)', () => {
  const rules = () => [robots().rules].flat()
  const forAgent = (a: string) => rules().find((r) => [r.userAgent].flat().includes(a))

  const ALLOWED_AI = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User',
    'Claude-SearchBot', 'Claude-Web', 'Google-Extended', 'PerplexityBot', 'Perplexity-User',
  ]

  it('keeps every private path disallowed, exactly, for everyone who may read the site', () => {
    for (const agent of ['*', ...ALLOWED_AI]) {
      const r = forAgent(agent)!
      expect(r, agent).toBeTruthy()
      expect(r.disallow, agent).toEqual(['/founder/', '/api/', '/docs', '/auth/', '/portal'])
      expect(r.allow, agent).toBe('/')
    }
  })

  it('never disallows /cards for the named AI assistants', () => {
    for (const agent of ALLOWED_AI) {
      for (const path of [forAgent(agent)!.disallow].flat()) expect('/cards'.startsWith(path as string), agent).toBe(false)
    }
  })

  it('blocks the crawlers not named by the founder decision outright', () => {
    for (const agent of ['CCBot', 'anthropic-ai', 'Applebot-Extended', 'Bytespider']) {
      const r = forAgent(agent)!
      expect(r, agent).toBeTruthy()
      expect(r.disallow).toBe('/')
      expect(r.allow).toBeUndefined()
    }
    expect(robots().sitemap).toEqual(['https://unite-group.in/sitemap.xml', 'https://unite-group.in/video-sitemap.xml'])
  })
})

describe('llms.txt (AC-7)', () => {
  it('mentions the card offer and its terms, never /grow, with prices from CARD_TIERS, and never the internal agency', () => {
    expect(llms).not.toContain('/grow')
    expect(llms).toContain('/cards/terms')
    expect(llms).toMatch(/video business card/i)
    for (const t of CARD_TIERS) expect(llms).toContain(`$${t.priceAud} AUD`)
    expect(llms.match(/synthex/gi) ?? []).toHaveLength(0)
    expect(llms).not.toMatch(/unite-group\.com\.au/)
  })
})

describe('/auth/login', () => {
  it('is noindex', () => {
    expect(loginMeta.robots).toEqual({ index: false, follow: false })
  })
})
