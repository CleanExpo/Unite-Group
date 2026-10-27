import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))

import { getUser } from '@/lib/supabase/server'

import { PILLARS, pillarPath } from '@/lib/public-site'

import RootPage from '../page'

// Phill 25/10/2026 (lead ruling): the home is dark and built like Higgsfield: media cards, tiles, galleries, almost no
// paragraphs. These tests hold the structure: section order, the uppercase headline, three media cards, six tiles with
// the approved logos, the ten-film gallery, four job cards marked Coming, three step cards, and one-line cards.

const PUBLIC = join(__dirname, '..', '..', '..', 'public')
const PUB_CSS = (f: string) => readFileSync(join(__dirname, '..', '..', 'components', 'public', f), 'utf8')

const signedOut = async () => {
  vi.mocked(getUser).mockResolvedValue(null as Awaited<ReturnType<typeof getUser>>)
  return renderToStaticMarkup(await RootPage())
}
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
/** Every element carrying the attribute, by its opening tag to the matching close of the same tag name. */
function blocks(html: string, attr: string, tag: string) {
  const out: string[] = []
  const open = new RegExp(`<${tag}[^>]*\\b${attr}\\b[^>]*>`, 'g')
  for (const m of html.matchAll(open)) {
    const start = m.index!
    let depth = 0
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g')
    re.lastIndex = start
    for (let t = re.exec(html); t; t = re.exec(html)) {
      depth += t[1] ? -1 : 1
      if (depth === 0) {
        out.push(html.slice(start, re.lastIndex))
        break
      }
    }
  }
  return out
}
const between = (html: string, a: string, b: string) => html.slice(html.indexOf(`id="${a}"`), html.indexOf(`id="${b}"`))

beforeEach(() => {
  vi.clearAllMocks()
  // Card prices show only while a card payment link is live (liveCardTiers); open both by default.
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
})
afterEach(() => vi.unstubAllEnvs())

describe('the dark home: section order', () => {
  // Phill 27/10/2026 (look approved): the repeated doors, the four Coming pillars and the showroom banner are gone; one
  // spotlight (moving card + live list) sits between the chooser and the gallery.
  it('runs hero, the start chooser, the live-today spotlight, the living-cards gallery, three steps, FAQ, contact, footer', async () => {
    const html = await signedOut()
    const ids = ['hero', 'start', 'today', 'cards', 'how', 'answers', 'contact', 'footer']
    const at = ids.map((id) => html.indexOf(`id="${id}"`))
    for (const [i, id] of ids.entries()) expect(at[i], id).toBeGreaterThan(-1)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    for (const gone of ['highlights', 'pillars', 'proof']) expect(html, gone).not.toContain(`id="${gone}"`)
  })

  it('is dark: a near-black canvas, light ink, and a display-font hero title in the stylesheet', () => {
    const tokens = readFileSync(join(__dirname, '..', '..', 'styles', 'public-tokens.css'), 'utf8')
    expect(tokens).toMatch(/--pub-canvas:\s*#0[0-9a-f]{5}/i)
    expect(tokens).toMatch(/--pub-ink:\s*#f/i)
    const hero = PUB_CSS('home/home-page.module.css')
    const h1 = hero.match(/\.h1\s*\{[^}]*\}/)?.[0] ?? ''
    expect(h1).toMatch(/font-family:\s*var\(--pub-display\)/)
    expect(h1).toMatch(/font-weight:\s*600/)
    expect(tokens).toMatch(/--pub-display:[^;]*syne|--pub-display:[^;]*instrument/i)
  })
})

describe('the live-today spotlight', () => {
  it('shows one moving card (never a static picture), the live list, and CRM on the one Coming line', async () => {
    const html = await signedOut()
    const spot = between(html, 'today', 'cards')
    // Phill, 27/10/2026: the homepage says just "CRM", never "Nexus CRM", and no "Nexus" in the spotlight at all.
    expect(html).not.toMatch(/Nexus\s*CRM/i)
    expect(spot).not.toMatch(/Nexus/i)
    const card = blocks(spot, 'data-moving-card', 'a')
    expect(card).toHaveLength(1)
    expect(card[0]).toContain('href="/cards"')
    expect(card[0]).toMatch(/<video[^>]*src="\/cards\/media\/edition-constellation\.mp4#t=0,1\.8"/)
    expect(card[0]).not.toContain('<img')
    expect(card[0]).toContain('AI-generated')
    expect(blocks(spot, 'data-today-item', 'li').length).toBeGreaterThanOrEqual(3)
    const coming = blocks(spot, 'data-coming', 'div')
    expect(coming).toHaveLength(1)
    expect(strip(coming[0])).toMatch(/^Coming\s*CRM/)
    expect(spot.match(/data-chip="coming"/g)).toHaveLength(1)
  })
})

describe('no restoration sister-company tiles on the home (UNI-3017)', () => {
  it('renders no business tiles and no restoration brand names', async () => {
    const html = await signedOut()
    expect(blocks(html, 'data-tile', 'li')).toHaveLength(0)
    expect(html).not.toMatch(/CARSI|Disaster Recovery|NRPG|Trade Hall|RestoreAssist/)
  })
})

describe('the living cards gallery', () => {
  it('shows the nine edition films, poster first and labelled AI-generated, with an orange From $249 button', async () => {
    const html = await signedOut()
    const cards = between(html, 'cards', 'how')
    const tiles = blocks(cards, 'data-gallery-tile', 'a')
    expect(tiles).toHaveLength(9)
    const names = tiles.map((t) => t.match(/data-gallery-tile="([a-z]+)"/)![1])
    expect(names).toEqual(['blueprint', 'forge', 'constellation', 'ink', 'rewind', 'skyline', 'origami', 'portal', 'magnet'])
    for (const t of tiles) {
      const poster = t.match(/<img[^>]*src="([^"]+)"/)?.[1]
      expect(poster, t).toBeTruthy()
      expect(existsSync(join(PUBLIC, poster!)), poster).toBe(true)
      expect(t).toContain('AI-generated')
      expect(t).not.toContain('<video')
    }
    expect(cards).toMatch(/<a [^>]*href="\/cards\/order"[^>]*>From \$249<\/a>/)
  })

  it('offers no card price while online ordering is off', async () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', '')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', '')
    const cards = between(await signedOut(), 'cards', 'how')
    expect(cards).toMatch(/<a [^>]*href="\/cards\/order"[^>]*>Ask about a card<\/a>/)
    expect(cards).not.toMatch(/\$\d/)
    expect(cards).not.toContain('GST included')
    const cost = between(await signedOut(), 'answers', 'contact')
    expect(cost).toContain('Online card orders are not open yet')
    expect(cost).not.toMatch(/\$249|\$449/)
  })

  it('plays only when motion is allowed: hover on a pointer device, in view on touch, never under reduced motion', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'components', 'public', 'gallery-tile.tsx'), 'utf8')
    expect(src).toContain("(prefers-reduced-motion: reduce)")
    expect(src).toContain("(hover: hover)")
    expect(src).toContain('IntersectionObserver')
    expect(src).toMatch(/muted/)
    expect(src).toMatch(/playsInline/)
  })
})

describe('the pillars and the three step cards', () => {
  it('no longer repeats the four Coming pillars on the home: each pillar page stays reachable from the nav or footer', async () => {
    const html = await signedOut()
    expect(blocks(html, 'data-job', 'article')).toHaveLength(0)
    for (const p of PILLARS) expect(html, p.slug).toContain(`href="${pillarPath(p.slug)}"`)
  })

  it('has three step cards: pick, send, approve', async () => {
    const steps = blocks(between(await signedOut(), 'how', 'answers'), 'data-step', 'article')
    expect(steps.map((s) => strip(s.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)![1]))).toEqual(['Pick an opener', 'Send your details', 'Approve a proof'])
    const { STEP_SCREENS } = await import('@/components/public/home-screens')
    for (const [i, k] of (['pick', 'send', 'approve'] as const).entries()) {
      expect(steps[i], k).toContain(`src="${STEP_SCREENS[k].src}"`)
      expect(steps[i], k).toMatch(/<img[^>]*alt="[^"]{20,}"/)
    }
  })
})

describe('almost no paragraphs', () => {
  it('keeps every card and tile caption to one short line', async () => {
    const html = await signedOut()
    const area = html.slice(html.indexOf('id="today"'), html.indexOf('id="answers"'))
    const paragraphs = [...area.matchAll(/<p(?![^>]*data-dr-line)[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]))
    expect(paragraphs.length).toBeGreaterThan(6)
    for (const p of paragraphs) expect(p.length, p).toBeLessThanOrEqual(64)
  })
})

describe('images come from one map, and no file appears twice', () => {
  it('maps every slot to an existing file with real alt text and repeats no file', async () => {
    const { VISUALS } = await import('@/components/public/visuals')
    // the job and step cards moved to real product screens (home-screens.ts); the map keeps the media cards and banner
    expect(Object.keys(VISUALS).sort()).toEqual(['network', 'nexus', 'showroom'])
    const filled = Object.entries(VISUALS).flatMap(([slot, v]) => (v ? [[slot, v] as const] : []))
    // every slot has its own picture; the CRM card shows the real product, not an abstract image (Phill, 25/10/2026)
    expect(Object.entries(VISUALS).filter(([, v]) => !v).map(([k]) => k)).toEqual([])
    expect(VISUALS.nexus?.src).toBe('/landing/visuals/nexus-1280.webp')
    expect(VISUALS.nexus?.small).toBe('/landing/visuals/nexus-640.webp')
    expect(VISUALS.nexus?.alt).toMatch(/^The CRM inbox/)
    const files: string[] = []
    for (const [slot, v] of filled) {
      for (const f of [v.src, v.small]) {
        expect(existsSync(join(PUBLIC, f)), `${slot}: ${f}`).toBe(true)
        files.push(f)
      }
      expect(v.alt.length, `${slot} alt`).toBeGreaterThanOrEqual(20)
      expect(v.alt, `${slot} alt`).not.toMatch(/\b(image|picture|photo) of\b/i)
    }
    expect(new Set(files).size, 'a file is mapped to two slots').toBe(files.length)
    expect(readdirSync(join(PUBLIC, 'landing', 'visuals')).filter((f) => !/\.webp$/.test(f))).toEqual([])
    // the home no longer shows the media-card pictures (27/10/2026 redesign); none may appear more than once
    const html = await signedOut()
    for (const [slot, v] of filled) expect(html.split(`src="${v.src}"`).length - 1, slot).toBeLessThanOrEqual(1)
    for (const f of ['public-home.tsx', 'home/home-page.tsx']) {
      expect(readFileSync(join(__dirname, '..', '..', 'components', 'public', f), 'utf8'), f).not.toMatch(/\/landing\/visuals\//)
    }
  })

  // Phill 25/10/2026: the same image must not appear in more than one place on the home page.
  // WHAT THIS SCANS: every CONTENT file the home renders, that is each <img>, <video> and <source> tag (src, srcset, poster)
  // in the rendered home markup, plus every url() in the component stylesheets: the film posters, the three media cards,
  // the nine gallery stills, and the job, step and banner pictures. One tag is one reference, so an img with a src and a
  // srcset counts once. A file used by two tags fails, in the same section or in two.
  // WHAT IT SKIPS: files under /landing/logos/ (the business logos and the nav mark). A logo is the brand's mark, not a
  // picture, and may appear once in the tiles and once in any business list (Phill 25/10/2026).
  it('references no image, poster, video or background file more than once on the home page (not twice in one section either)', async () => {
    const html = await signedOut()
    const markers = ['header', 'hero', 'start', 'today', 'cards', 'how', 'answers', 'contact', 'footer']
    const starts = markers.map((m) => (m === 'header' ? html.indexOf('<header') : html.indexOf(`id="${m}"`)))
    for (const [i, m] of markers.entries()) expect(starts[i], m).toBeGreaterThan(-1)
    // one entry per element (an img with its src and srcset is ONE reference), keyed by file, remembering the section
    const files = new Map<string, string[]>()
    const note = (tagFiles: string[], where: string) => {
      for (const file of new Set(tagFiles.map((f) => f.split('?')[0]).filter((f) => /\.(webp|jpe?g|png|gif|avif|svg|mp4|webm)$/i.test(f) && !f.startsWith('/landing/logos/')))) {
        files.set(file, [...(files.get(file) ?? []), where])
      }
    }
    markers.forEach((m, i) => {
      const part = html.slice(starts[i], starts[i + 1] ?? html.length)
      for (const tag of part.matchAll(/<(?:img|video|source)\b[^>]*>/g)) {
        const found: string[] = []
        for (const x of tag[0].matchAll(/\b(?:src|poster)="([^"]+)"/g)) found.push(x[1])
        for (const x of tag[0].matchAll(/\bsrc[sS]et="([^"]+)"/g)) for (const c of x[1].split(',')) found.push(c.trim().split(/\s+/)[0])
        note(found, m)
      }
      for (const x of part.matchAll(/url\(\s*['"]?([^'")]+)/g)) note([x[1]], m)
    })
    // CSS modules: a background url in a component stylesheet is one more reference
    for (const f of readdirSync(join(__dirname, '..', '..', 'components', 'public')).filter((n) => n.endsWith('.css'))) {
      for (const x of readFileSync(join(__dirname, '..', '..', 'components', 'public', f), 'utf8').matchAll(/url\(\s*['"]?([^'")]+)/g)) note([x[1]], `css:${f}`)
    }
    expect([...files.keys()].filter((f) => f.includes("/cards/media/edition-")).length, "positive control: the nine gallery posters were scanned").toBe(9)
    const repeated = [...files].filter(([, where]) => where.length > 1).map(([file, where]) => `${file} used ${where.length} times (${where.join(', ')})`)
    expect(repeated).toEqual([])
  })
})

describe('one primary path', () => {
  it('keeps From $249 as the one offer button: every other link to /cards is secondary or the moving card', async () => {
    const html = await signedOut()
    // the contact form's submit button is the only other primary, and it is a form button, not an offer link
    expect(html.match(/<a [^>]*buttonPrimary/g)).toHaveLength(1)
    expect(between(html, 'cards', 'how')).toMatch(/class="[^"]*buttonPrimary[^"]*"[^>]*>From \$249<|href="\/cards\/order"[^>]*class="[^"]*buttonPrimary/)
    expect(between(html, 'cards', 'how')).toMatch(/<a [^>]*href="\/cards"[^>]*class="[^"]*buttonSecondary/)
  })
})

describe('the Margot phone slot in the contact band', () => {
  it('renders nothing while MARGOT_PHONE_NUMBER is unset or not E.164', async () => {
    for (const v of [undefined, '', '  ', '0412345678', '+1', '+61 412 345 678', 'tel:+61412345678']) {
      if (v === undefined) vi.stubEnv('MARGOT_PHONE_NUMBER', '')
      else vi.stubEnv('MARGOT_PHONE_NUMBER', v)
      const html = await signedOut()
      expect(html, String(v)).not.toContain('tel:')
      const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('id="footer"'))
      expect(contact, String(v)).not.toContain('Margot')
    }
  })

  it('shows a tel: link and the AI line in the contact band for a valid number', async () => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61731234567')
    const html = await signedOut()
    const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('<footer'))
    expect(contact).toContain('href="tel:+61731234567"')
    expect(contact).toContain('Call Margot (AI assistant)')
    expect(contact).toContain('Answered by our AI assistant. Messages go to our team by email.')
  })
})
