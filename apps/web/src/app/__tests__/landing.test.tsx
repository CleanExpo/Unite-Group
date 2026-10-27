import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'

import { buildHomeLeadBody } from '@/components/public/contact-form'
import { PILLARS, pillarPath } from '@/lib/public-site'
import { isPublicPath } from '@/proxy'

import RootPage, { metadata } from '../page'

const signedOut = async () => {
  vi.mocked(getUser).mockResolvedValue(null as Awaited<ReturnType<typeof getUser>>)
  return renderToStaticMarkup(await RootPage())
}

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** One position's markup, from its opening tag. */
const section = (html: string, id: string, next: string) =>
  html.slice(html.lastIndexOf('<', html.indexOf(`id="${id}"`)), html.lastIndexOf('<', html.indexOf(`id="${next}"`)))

/** Every anchor in the nav, in document order. */
function navLinks(html: string) {
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  return [...header.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: strip(m[2]) })).filter((l) => l.href !== '#main') // the skip link is not a nav item (golive-copy.test.tsx covers it)
}

beforeEach(() => {
  vi.clearAllMocks()
  // Card prices show only while a card payment link is live (liveCardTiers); open both by default.
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
})
afterEach(() => vi.unstubAllEnvs())

describe('/ nav rules (AC-2)', () => {
  it('has no Home item, one Contact, and no two links sharing an href', async () => {
    const links = navLinks(await signedOut())
    expect(links.length).toBeGreaterThan(6)
    expect(links.filter((l) => /^home$/i.test(l.text))).toHaveLength(0)
    expect(links.filter((l) => l.text === 'Email us')).toHaveLength(0)
    const hrefs = links.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(links[0]).toEqual({ href: '/', text: 'Unite Group' })
  })

  it('opens with a Solutions dropdown whose four links resolve to real public pages', async () => {
    const html = await signedOut()
    const nav = html.slice(html.indexOf('<nav aria-label="Main"'), html.indexOf('</nav>'))
    expect(nav.indexOf('<summary>Solutions</summary>')).toBeGreaterThan(-1)
    expect(nav.indexOf('<summary>')).toBeLessThan(nav.indexOf('href="/cards"'))
    const start = nav.indexOf('<summary>')
    const menu = nav.slice(nav.indexOf('<ul', start), nav.indexOf('</ul>', start))
    const hrefs = [...menu.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefs).toEqual(['visibility', 'experience', 'conversion', 'intelligence'].map((p) => `/solutions/${p}`))
    for (const href of hrefs) {
      expect(existsSync(join(__dirname, '..', href.slice(1), 'page.tsx')), href).toBe(true)
      expect(isPublicPath(href), href).toBe(true)
    }
  })

  it('links only to pages or anchors that exist', async () => {
    const html = await signedOut()
    for (const { href } of navLinks(html)) {
      if (href === 'mailto:contact@unite-group.in') continue // UNI-3034 Email us; MX checked
      if (href.startsWith('/#')) expect(html, href).toContain(`id="${href.slice(2)}"`)
      else if (href !== '/') expect(existsSync(join(__dirname, '..', href.slice(1), 'page.tsx')), href).toBe(true)
    }
  })
})

describe('/ positions (AC-3)', () => {
  it('has the eight positions in the fixed order', async () => {
    const html = await signedOut()
    const ids = [...html.matchAll(/<(?:section|footer)[^>]*data-position[^>]*id="([a-z]+)"/g)].map((m) => m[1])
    // Phill 25/10/2026: the living-cards gallery comes before the four jobs
    expect(ids).toEqual(['hero', 'cards', 'pillars', 'how', 'proof', 'answers', 'contact', 'footer'])
  })
})

// Phill 25/10/2026 (lead ruling after the #1225 preview): Unite-Group is the umbrella over every business and
// the CRM, never framed as one product. The H1 is the umbrella line; the card is ONE offer, lower down. This
// supersedes the earlier must-fix "card offer above the fold".
describe('/ hero and metadata', () => {
  it('says the umbrella line in the H1, and carries Unite Group and the honest Nexus line in the metadata', async () => {
    const html = await signedOut()
    expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '')).toBe('Your business deserves a clearer front door.')
    expect(String(metadata.title)).toBe('Unite Group | Living business cards & growth for Australian businesses')
    const description = String(metadata.description)
    expect(description).toMatch(/Margot as your AI guide/)
    expect(description).toContain('Australia and New Zealand')
    expect(description).toMatch(/Living business cards/)
    expect(`${metadata.title} ${description}`).not.toMatch(/makes video business cards|video business card/i)
    expect(`${metadata.title} ${description}`).not.toMatch(/synthex/i)
  })

  it('paints the words and the poster first, and mounts no video on the server', async () => {
    const html = await signedOut()
    expect(html).toContain('data-hero-media')
    expect(html.indexOf('<h1')).toBeGreaterThan(-1)
    expect(html).not.toMatch(/<video|\.mp4/)
    expect(html).not.toMatch(/FIG\. 1|hero-figure|Pause the animation/)
    const dir = join(__dirname, '..', '..', 'components', 'public')
    expect(readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif|mp4|webm|avif)$/i.test(f))).toEqual([])
    const media = readdirSync(join(__dirname, '..', '..', '..', 'public', 'landing', 'media'))
    expect(media.filter((f) => /\.png$/i.test(f))).toEqual([])
    expect(media.sort()).toEqual([
      'unite-group-hero-u-assemble-16x9-web.mp4',
      'unite-group-hero-u-assemble-16x9.webm',
      'unite-group-hero-u-poster-16x9-1280.webp',
      'unite-group-hero-u-poster-16x9-768.webp',
      'unite-group-hero-u-poster-16x9.jpg',
    ])
  })

  it('keeps the card offer out of the hero and lower down: the group section, then the gallery, then the jobs', async () => {
    const html = await signedOut()
    const hero = html.slice(html.indexOf('id="hero"'), html.indexOf('id="start"'))
    expect(html.indexOf('id="start"'), 'the chooser follows the hero').toBeLessThan(html.indexOf('id="highlights"'))
    expect(hero).not.toMatch(/living card|\$249|\$449|GST/)
    expect(hero).toContain('href="#contact"')
    expect(hero).toContain('href="#start"')
    expect(html).not.toContain('id="group"')
    expect(html.indexOf('id="hero"')).toBeLessThan(html.indexOf('id="today"'))
    expect(html.indexOf('id="today"')).toBeLessThan(html.indexOf('id="cards"'))
    expect(html.indexOf('id="cards"')).toBeLessThan(html.indexOf('id="pillars"'))
    const cards = html.slice(html.indexOf('id="cards"'), html.indexOf('id="pillars"'))
    expect(cards).toContain('See the living card')
    expect(cards).toContain('$249')
    expect(cards).toContain('$449')
    expect(cards).toContain('GST included')
  })

  it('puts the U mark left of the wordmark in the nav', async () => {
    const html = await signedOut()
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    const logo = header.match(/<a [^>]*href="\/"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? ''
    expect(logo).toMatch(/<img[^>]*src="\/landing\/logos\/unite-group-nexus-mark\.webp"[^>]*width="\d+"[^>]*height="\d+"/)
    expect(logo.indexOf('<img')).toBeLessThan(logo.indexOf('Unite Group'))
  })
})

describe('/ pillars and honesty', () => {
  it('marks every pillar Coming, and says on Conversion alone that the card is on sale', async () => {
    const html = await signedOut()
    const row = html.slice(html.indexOf('id="pillars"'), html.indexOf('id="how"'))
    expect(row.match(/>Coming</g)).toHaveLength(4)
    expect(row.match(/Card from \$249/g)).toHaveLength(1)
    expect(row).not.toMatch(/Ask us/)
    for (const p of PILLARS) expect(row).toContain(`href="${pillarPath(p.slug)}"`)
  })

  it('names no card price on the Conversion chip while online ordering is off', async () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', '')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', '')
    const html = await signedOut()
    const row = html.slice(html.indexOf('id="pillars"'), html.indexOf('id="how"'))
    expect(row.match(/Card on enquiry/g)).toHaveLength(1)
    expect(row).not.toMatch(/Card from \$/)
  })

  it('has one honest proof sentence: no table, no numbers, no testimonials', async () => {
    const html = await signedOut()
    const proof = section(html, 'proof', 'answers')
    expect(proof).not.toMatch(/<table|<li/)
    expect(strip(proof)).not.toMatch(/\d|testimonial/i)
    expect(proof).toContain('href="/cards"')
  })

  // Codex 25/10: the hero film is not one of the card editions the showroom plays, so "every film we have made" was false
  it('scopes the results banner to the card films the showroom really plays, never to every film', async () => {
    const proof = strip(section(await signedOut(), 'proof', 'answers'))
    expect(proof).not.toMatch(/every film|all (of )?our films|all films/i)
    expect(proof).toMatch(/card films/i)
  })

  it('has four to six real questions and says plainly what is unknown', async () => {
    const html = await signedOut()
    const answers = html.slice(html.indexOf('id="answers"'), html.indexOf('id="contact"'))
    const count = answers.match(/<summary>/g)?.length ?? 0
    expect(count).toBeGreaterThanOrEqual(4)
    expect(count).toBeLessThanOrEqual(6)
    expect(answers).toContain('We host your card for 12 months') // the card terms are the source (go-live audit D5)
  })
})

describe('/ contact and footer', () => {
  it('has one route (the form), the email as text, and the /grow wire contract', async () => {
    const html = await signedOut()
    const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('<footer'))
    expect(contact.match(/<form/g)).toHaveLength(1)
    expect(contact).toContain('contact@unite-group.in')

    const form = new FormData()
    form.set('first_name', ' Sam ')
    form.set('email', 'sam@example.com')
    form.set('interest', 'Something else')
    form.set('message', 'Hello')
    form.set('marketing_consent', 'on')
    expect(buildHomeLeadBody(form)).toEqual({
      first_name: 'Sam',
      email: 'sam@example.com',
      phone: undefined,
      interests: 'Something else',
      message: 'Hello',
      referral_source: 'home',
      marketing_consent: true,
      business_key: 'unite-smb',
    })
  })

  it('reaches the founder sign-in only through the small footer link, and offers no sign-up', async () => {
    const html = await signedOut()
    const footer = html.slice(html.indexOf('<footer'))
    expect(footer).toMatch(/<a href="\/auth\/login" data-footer-login="true"[^>]*>Founder login<\/a>/)
    expect(html.match(/href="\/auth\/login"/g)).toHaveLength(1)
    expect(html.slice(0, html.indexOf('<footer'))).not.toMatch(/sign.?in|log.?in/i)
    expect(html).not.toMatch(/sign.?up|register|create (an )?account|signup/i)
    expect(html).not.toMatch(/href="\/auth\/(?!login")/)
  })

  it('shows the legal name, Privacy, Terms and the ABR-verified ABN (25/10/2026) unless COMPANY_ABN overrides it', async () => {
    vi.stubEnv('COMPANY_ABN', '')
    const dflt = await signedOut()
    const footer = dflt.slice(dflt.indexOf('<footer'))
    expect(footer).toContain('Unite-Group Nexus Pty Ltd')
    // was 'ABN pending': an unset or blank COMPANY_ABN now falls back to the number verified on the ABR
    expect(footer).toContain('ABN 95 691 477 844')
    expect(footer).not.toContain('ABN pending')
    expect(footer).toContain('href="/privacy-policy"')
    expect(footer).toContain('href="/terms-of-service"')
    expect(footer).toContain('href="/cards/terms"')

    vi.stubEnv('COMPANY_ABN', '51 824 753 556')
    const set = await signedOut()
    expect(set).toContain('ABN 51 824 753 556')
    expect(set).not.toContain('ABN 95 691 477 844')
  })
})

describe('/ copy rules (AC-13 part)', () => {
  it('never names the internal agency and avoids banned phrases, US spellings and emoji', async () => {
    const html = await signedOut()
    const text = strip(html)
    // the name may appear only in the businesses list (tiles), which is a <ul data-businesses> and nowhere else
    expect(html.replace(/<ul[^>]*data-businesses(?!-)[\s\S]*?<\/ul>/, '')).not.toMatch(/synthex/i)
    expect(text).not.toMatch(/AI platform|#1|revolutioni[sz]/i)
    expect(text).not.toMatch(/\bHome\b/)
    expect(text).not.toMatch(/\b(color|colors|center|organization)\b/i)
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('emits the entity JSON-LD once', async () => {
    const html = await signedOut()
    expect(html.match(/<script type="application\/ld\+json">/g)).toHaveLength(1)
    expect(html).toContain('"@type":"OnlineBusiness"')
  })
})

describe('/ signed in', () => {
  it('still sends a signed-in user to the command centre', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'b0000000-0000-4000-8000-000000000001' } as Awaited<ReturnType<typeof getUser>>)
    await expect(RootPage()).rejects.toThrow('NEXT_REDIRECT /founder/command-centre')
    expect(redirect).toHaveBeenCalledWith('/founder/command-centre')
  })
})
