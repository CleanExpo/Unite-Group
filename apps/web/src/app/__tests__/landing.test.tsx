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

import RootPage from '../page'

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
  return [...header.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: strip(m[2]) }))
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe('/ nav rules (AC-2)', () => {
  it('has no Home item, one Contact, and no two links sharing an href', async () => {
    const links = navLinks(await signedOut())
    expect(links.length).toBeGreaterThan(6)
    expect(links.filter((l) => /^home$/i.test(l.text))).toHaveLength(0)
    expect(links.filter((l) => l.text === 'Contact')).toHaveLength(1)
    const hrefs = links.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(links[0]).toEqual({ href: '/', text: 'Unite Group' })
  })

  it('opens with a "What we do" dropdown whose four links resolve to real public pages', async () => {
    const html = await signedOut()
    const nav = html.slice(html.indexOf('<nav aria-label="Main"'), html.indexOf('</nav>'))
    expect(nav.indexOf('<summary>What we do</summary>')).toBeGreaterThan(-1)
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
      if (href.startsWith('/#')) expect(html, href).toContain(`id="${href.slice(2)}"`)
      else if (href !== '/') expect(existsSync(join(__dirname, '..', href.slice(1), 'page.tsx')), href).toBe(true)
    }
  })
})

describe('/ positions (AC-3)', () => {
  it('has the eight positions in the fixed order', async () => {
    const html = await signedOut()
    const ids = [...html.matchAll(/<(?:section|footer)[^>]*data-position[^>]*id="([a-z]+)"/g)].map((m) => m[1])
    expect(ids).toEqual(['hero', 'pillars', 'cards', 'how', 'proof', 'answers', 'contact', 'footer'])
  })
})

describe('/ hero', () => {
  it('names Unite Group in the H1, paints the words before the figure, and leaves the media slot', async () => {
    const html = await signedOut()
    expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]).toContain('Unite Group')
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('<svg'))
    expect(html).toContain('data-hero-media')
    expect(html.indexOf('data-hero-media')).toBeLessThan(html.indexOf('<svg'))
    expect(html).toContain('FIG. 1')
    for (const view of ['Assembled', 'Exploded', 'Inside']) expect(html).toContain(`>${view}</label>`)
    expect(html).toContain('Pause the animation')
  })

  it('serves no video on first paint and adds no unapproved image or video outside public/landing/media', async () => {
    const html = await signedOut()
    expect(html).not.toMatch(/<video|\.mp4/)
    const dir = join(__dirname, '..', '..', 'components', 'public')
    expect(readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif|mp4|webm|avif)$/i.test(f))).toEqual([])
    const media = readdirSync(join(__dirname, '..', '..', '..', 'public', 'landing', 'media'))
    expect(media.filter((f) => /\.png$/i.test(f))).toEqual([])
    expect(media.sort()).toEqual([
      'unite-group-hero-exploded-16x9-air.webp',
      'unite-group-hero-exploded-9x16.webp',
      'unite-group-hero-loop-16x9.mp4',
      'unite-group-hero-loop-16x9.webm',
      'unite-group-hero-loop-poster-16x9.jpg',
    ])
  })

  it('shows both prices beside the button, from CARD_TIERS', async () => {
    const html = await signedOut()
    const hero = html.slice(html.indexOf('id="hero"'), html.indexOf('id="pillars"'))
    expect(hero).toContain('See the living card')
    expect(hero).toContain('$249')
    expect(hero).toContain('$449')
    expect(hero).toContain('GST included')
    expect(hero).toContain('href="#contact"')
  })
})

describe('/ pillars and honesty', () => {
  it('marks every pillar Coming except the card, which is on sale', async () => {
    const html = await signedOut()
    const row = html.slice(html.indexOf('id="pillars"'), html.indexOf('id="cards"'))
    expect(row.match(/>Coming</g)).toHaveLength(3)
    expect(row.match(/on sale now/g)).toHaveLength(1)
    expect(row).not.toMatch(/Ask us/)
    for (const p of PILLARS) expect(row).toContain(`href="${pillarPath(p.slug)}"`)
  })

  it('has one honest proof sentence: no table, no numbers, no testimonials', async () => {
    const html = await signedOut()
    const proof = section(html, 'proof', 'answers')
    expect(proof).not.toMatch(/<table|<li/)
    expect(strip(proof)).not.toMatch(/\d|testimonial/i)
    expect(proof).toContain('href="/cards"')
  })

  it('has four to six real questions and says plainly what is unknown', async () => {
    const html = await signedOut()
    const answers = html.slice(html.indexOf('id="answers"'), html.indexOf('id="contact"'))
    const count = answers.match(/<summary>/g)?.length ?? 0
    expect(count).toBeGreaterThanOrEqual(4)
    expect(count).toBeLessThanOrEqual(6)
    expect(answers).toContain('We have not set a hosting term yet')
  })
})

describe('/ contact and footer', () => {
  it('has one route (the form), the email as text, and the /grow wire contract', async () => {
    const html = await signedOut()
    const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('<footer'))
    expect(contact.match(/<form/g)).toHaveLength(1)
    expect(contact).toContain('contact@unite-group.in')
    expect(contact).not.toContain('href="mailto:')

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

  it('shows the legal name, Privacy, Terms, and ABN pending until COMPANY_ABN is set', async () => {
    vi.stubEnv('COMPANY_ABN', '')
    const pending = await signedOut()
    const footer = pending.slice(pending.indexOf('<footer'))
    expect(footer).toContain('Unite-Group Nexus Pty Ltd')
    expect(footer).toContain('ABN pending')
    expect(footer).toContain('href="/privacy-policy"')
    expect(footer).toContain('href="/terms-of-service"')

    vi.stubEnv('COMPANY_ABN', '51 824 753 556')
    const set = await signedOut()
    expect(set).toContain('ABN 51 824 753 556')
    expect(set).not.toContain('ABN pending')
  })
})

describe('/ copy rules (AC-13 part)', () => {
  it('never names the internal agency and avoids banned phrases, US spellings and emoji', async () => {
    const html = await signedOut()
    const text = strip(html)
    expect(html.replace(/<ul[^>]*data-businesses[\s\S]*?<\/ul>/, '')).not.toMatch(/synthex/i)
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
