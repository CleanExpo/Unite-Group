import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/analytics/site-tracker', () => ({ trackSiteEvent: vi.fn() }))

import { trackSiteEvent } from '@/components/analytics/site-tracker'
import sitemap from '@/app/sitemap'
import { validateManifest, type MediaManifest } from '@cleanexpo/premium-visuals/manifest'
import { BOTS, BOTS_HERO, LEAD_DEMO_ANCHOR } from '@/lib/bots/catalogue'
import manifestJson from '../../../../../../media.manifest.json'
import { botsPageJsonLd } from '@/lib/bots/jsonld'
import { TRACKED_PATHS } from '@/lib/analytics/site-events'
import { PUBLIC_ROUTES } from '@/lib/public-site'

import BotsPage, { metadata } from '../page'
import { buildBotLeadBody } from '../lead-body'
import { FUNNEL, GREETING, LEAD_CHAT_ENDPOINT, LeadDemo } from '../lead-demo'

const html = renderToStaticMarkup(createElement(BotsPage))
const words = (markup: string) => markup.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ')
const text = words(html)
/** The page's own copy. The shared nav and footer link to /pricing, which is a link label, not a price. */
const mainText = words(html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '')

const MANIFEST = manifestJson as unknown as MediaManifest
/** next/image serves /_next/image?url=<file>&w=...; the file is what must exist. */
const imageFile = (src: string) => {
  const decoded = src.replace(/&amp;/g, '&')
  return decoded.startsWith('/_next/image') ? new URL(decoded, 'https://x').searchParams.get('url') ?? '' : decoded
}

const BANNED =/\b(leverage|unleash|transformative|holistic|synergy|journey|guaranteed|leading|best)\b/i
const EMOJI = /\p{Extended_Pictographic}/u
const PRICE = /\$\s?\d|\bGST\b|\d\s?(?:dollars|aud)\b|per month|\bpric(?:e|es|ing)\b/i
const METHOD = /\b(?:schema|structured data|json-?ld|seo|aeo|geo|search visibility|ai search|rank(?:ing|ings)?)\b/i
const OTHER_BUSINESSES = /carsi|nrpg|disaster recovery|restoreassist|coach8|synthex/i

describe('/bots page', () => {
  it('renders one card per bot with its name and three dot points', () => {
    for (const bot of BOTS) {
      const card = html.match(new RegExp(`<article id="${bot.id}"[\\s\\S]*?</article>`))?.[0] ?? ''
      expect(card, bot.id).toContain(bot.name)
      expect(card.match(/<li>/g), bot.id).toHaveLength(3)
    }
    for (const name of ['Front desk voice', 'Lead follow-up', 'Bookings', 'Product and order']) expect(text).toContain(name)
  })

  it('makes only the lead follow-up demo live; every other card says Demo coming soon', () => {
    const live = html.match(/<article id="lead-follow-up"[\s\S]*?<\/article>/)?.[0] ?? ''
    expect(live).toMatch(new RegExp(`href="#${LEAD_DEMO_ANCHOR}"[^>]*data-track="cta"[^>]*data-track-label="bots-try-lead-follow-up"[^>]*>Try it live<`))
    for (const bot of BOTS.filter((b) => b.id !== 'lead-follow-up')) {
      const card = html.match(new RegExp(`<article id="${bot.id}"[\\s\\S]*?</article>`))?.[0] ?? ''
      expect(card, bot.id).toContain('Demo coming soon')
      expect(card, bot.id).not.toContain('Try it live')
    }
    expect(html).toContain(`id="${LEAD_DEMO_ANCHOR}"`)
  })

  it('every CTA link fires a site analytics event', () => {
    const ctas = [...html.matchAll(/<a [^>]*class="[^"]*btnPrimary[^"]*"[^>]*>/g)].map((m) => m[0])
    expect(ctas.length).toBeGreaterThan(1)
    for (const a of ctas) expect(a).toMatch(/data-track="cta" data-track-label="bots-[a-z-]+"/)
  })

  it('shows no prices, no GST, nothing about the confidential search method and no other business', () => {
    expect(mainText.length).toBeGreaterThan(500)
    expect(mainText).not.toMatch(PRICE)
    expect(text).not.toMatch(/\$\s?\d|\bGST\b/)
    expect(text).not.toMatch(METHOD)
    expect(text).not.toMatch(OTHER_BUSINESSES)
    expect(text).not.toMatch(BANNED)
    expect(text).not.toMatch(EMOJI)
    expect(JSON.stringify(metadata)).not.toMatch(PRICE)
    expect(JSON.stringify(metadata)).not.toMatch(METHOD)
  })

  it('draws nothing: no SVG, no canvas, and every picture is a real file listed in the media manifest', () => {
    expect(html).not.toMatch(/<svg|<canvas/i)
    // The shared nav and footer carry the logo mark; every picture inside <main> is page media.
    const mainHtml = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? ''
    const srcs = [...mainHtml.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => imageFile(m[1]))
    expect(srcs.length).toBe(BOTS.length + 1)
    const listed = new Set(MANIFEST.entries.map((e) => e.src))
    for (const src of srcs) {
      expect(listed.has(src), src).toBe(true)
      expect(readFileSync(join(__dirname, '..', '..', '..', '..', 'public', src)).length).toBeGreaterThan(1000)
    }
    expect(html).not.toContain('<video')
  })

  it('meets the premium visual standard: a photo hero, a motion section and one generated picture per bot', () => {
    expect(validateManifest(MANIFEST)).toEqual([])
    const hero = html.match(/<header data-pv-hero[\s\S]*?<\/header>/)?.[0] ?? ''
    expect(hero).toContain('<h1')
    expect(hero).toMatch(/<img [^>]*src="[^"]*bots%2Fvisuals%2Fhero-1600\.webp/)
    expect(BOTS_HERO.source).toBe('generated')
    // Hero motion alone does not count: the bot team grid is its own motion section.
    expect(html.replace(hero, '')).toContain('data-pv-motion')
    for (const bot of BOTS) {
      const card = html.match(new RegExp(`<article id="${bot.id}"[\\s\\S]*?</article>`))?.[0] ?? ''
      expect(card, bot.id).toContain(`data-image-slot="${bot.image.name}"`)
      expect(bot.image.media.src, bot.id).toBe(`/bots/visuals/${bot.id}-1600.webp`)
      expect(bot.image.media.source, bot.id).toBe('generated')
      expect(card, bot.id).toContain(`alt="${bot.image.media.alt}"`)
    }
  })

  it('emits a Service per bot, no offers or prices, and a VideoObject only where a video exists', () => {
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '{}')
    expect(ld).toEqual(botsPageJsonLd())
    expect(ld['@graph']).toHaveLength(BOTS.length)
    for (const node of ld['@graph']) {
      expect(node['@type']).toBe('Service')
      expect(node.provider).toEqual({ '@id': 'https://unite-group.in/#organization' })
      expect(node).not.toHaveProperty('offers')
    }
    expect(JSON.stringify(ld)).not.toContain('VideoObject')
    expect(JSON.stringify(ld)).not.toMatch(PRICE)
  })

  it('is indexed, listed in the sitemap and measured', () => {
    expect(metadata.robots).toEqual({ index: true, follow: true })
    expect(PUBLIC_ROUTES).toContain('/bots')
    expect(TRACKED_PATHS).toContain('/bots')
    expect(sitemap().map((e) => e.url)).toContain('https://unite-group.in/bots')
  })

  it('adds nothing under NEXT_PUBLIC_ in any bots file', () => {
    const roots = [join(__dirname, '..'), join(__dirname, '..', '..', 'api', 'bots', 'lead-chat'), join(__dirname, '..', '..', '..', 'lib', 'bots')]
    for (const dir of roots) {
      for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
        expect(readFileSync(join(dir, file), 'utf8'), file).not.toContain('NEXT_PUBLIC_')
      }
    }
  })
})

describe('buildBotLeadBody', () => {
  it('builds the existing /api/leads body, labelled as a bots demo lead', () => {
    expect(
      buildBotLeadBody({ name: ' Sam  Lee ', email: 'SAM@Example.com ', phone: '', need: ' More bookings ', marketingConsent: false, via: 'chat' }),
    ).toEqual({
      first_name: 'Sam',
      last_name: 'Lee',
      email: 'sam@example.com',
      phone: undefined,
      interests: 'bots-lead-follow-up',
      message: 'Offer: bots-lead-follow-up\nCaptured by: lead follow-up demo bot\nNeed: More bookings',
      referral_source: 'bots-lead-follow-up:chat',
      marketing_consent: false,
      business_key: 'unite-smb',
    })
  })
})

describe('LeadDemo funnel', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))

  function say(message: string) {
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: message } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  }

  it('fires bot_chat_started once, shows the captured details, and fires lead_captured after the lead is written', async () => {
    fetchMock
      .mockReturnValueOnce(json(200, { reply: 'What is your name?', capture: null, turnsLeft: 5 }))
      .mockReturnValueOnce(json(200, { reply: 'Thanks Sam.', capture: { name: 'Sam Lee', email: 'sam@example.com', phone: '0400000000', need: 'Cafe enquiries' }, turnsLeft: 4 }))
      .mockReturnValueOnce(json(201, { id: 'lead-1' }))

    render(createElement(LeadDemo))
    expect(screen.getByText(GREETING)).toBeTruthy()

    say('I run a cafe')
    await screen.findByText('What is your name?')
    expect(fetchMock.mock.calls[0][0]).toBe(LEAD_CHAT_ENDPOINT)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual([
      { role: 'assistant', content: GREETING },
      { role: 'user', content: 'I run a cafe' },
    ])

    say('Sam Lee, sam@example.com, 0400000000')
    await screen.findByDisplayValue('sam@example.com')
    expect(trackSiteEvent).toHaveBeenCalledTimes(1)
    expect(trackSiteEvent).toHaveBeenCalledWith(FUNNEL.chatStarted.type, 'bot_chat_started')

    fireEvent.click(screen.getByRole('checkbox', { name: /may contact me/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send my details' }))
    await screen.findByText(/your details are with the Unite Group team/)

    expect(fetchMock.mock.calls[2][0]).toBe('/api/leads')
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
      first_name: 'Sam',
      email: 'sam@example.com',
      phone: '0400000000',
      referral_source: 'bots-lead-follow-up:chat',
    })
    expect(trackSiteEvent).toHaveBeenLastCalledWith(FUNNEL.leadCaptured.type, 'lead_captured')
  })

  it('falls back to the plain form when the bot is switched off, and still writes the lead', async () => {
    fetchMock
      .mockReturnValueOnce(json(503, { error: 'The demo bot is not available right now.', fallback: 'form' }))
      .mockReturnValueOnce(json(201, { id: 'lead-2' }))

    render(createElement(LeadDemo))
    say('Need help with bookings')
    await screen.findByDisplayValue('Need help with bookings')

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /may contact me/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send my details' }))
    await waitFor(() => expect(trackSiteEvent).toHaveBeenLastCalledWith('form_submit', 'lead_captured'))
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ first_name: 'Alex', referral_source: 'bots-lead-follow-up:form' })
  })

  it('does not fire lead_captured when the lead write fails', async () => {
    fetchMock
      .mockReturnValueOnce(json(503, { error: 'off', fallback: 'form' }))
      .mockReturnValueOnce(json(500, { error: 'Failed to capture lead' }))
    render(createElement(LeadDemo))
    say('hello')
    await screen.findByDisplayValue('hello')
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /may contact me/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send my details' }))
    await screen.findByRole('alert')
    expect(trackSiteEvent).not.toHaveBeenCalledWith('form_submit', 'lead_captured')
  })
})
