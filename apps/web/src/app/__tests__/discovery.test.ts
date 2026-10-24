import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'

import { metadata as loginMeta } from '../(auth)/auth/login/layout'
import robots from '../robots'
import sitemap from '../sitemap'

const llms = readFileSync(join(__dirname, '..', '..', '..', 'public', 'llms.txt'), 'utf8')

describe('sitemap (AC-7)', () => {
  it('lists the home, grow, cards, order, terms, four pillars and the two legal pages, and nothing private', () => {
    const paths = sitemap().map((e) => new URL(e.url).pathname)
    expect(paths).toEqual([
      '/', '/grow', '/cards', '/cards/order', '/cards/terms',
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

  it('keeps /founder/, /api/ and /docs disallowed for everyone who may read the site', () => {
    for (const agent of ['*', 'ChatGPT-User', 'Claude-Web']) {
      const r = forAgent(agent)!
      expect(r, agent).toBeTruthy()
      expect([r.disallow].flat()).toEqual(expect.arrayContaining(['/founder/', '/api/', '/docs']))
      expect(r.allow).toBe('/')
    }
  })

  it('lets user-triggered fetchers read public paths and blocks training crawlers outright', () => {
    for (const agent of ['ChatGPT-User', 'Claude-Web', 'Claude-User']) expect(forAgent(agent)!.allow).toBe('/')
    for (const agent of ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'Google-Extended']) {
      const r = forAgent(agent)!
      expect(r, agent).toBeTruthy()
      expect(r.disallow).toBe('/')
      expect(r.allow).toBeUndefined()
    }
    expect(robots().sitemap).toBe('https://unite-group.in/sitemap.xml')
  })
})

describe('llms.txt (AC-7)', () => {
  it('mentions the card offer and /grow, with prices from CARD_TIERS, and never the internal agency', () => {
    expect(llms).toContain('/grow')
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
