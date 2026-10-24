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

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe('the dark home: section order', () => {
  it('runs hero, three media cards, the group, the living-cards gallery, four jobs, three steps, results, FAQ, contact, footer', async () => {
    const html = await signedOut()
    const ids = ['hero', 'highlights', 'group', 'cards', 'pillars', 'how', 'proof', 'answers', 'contact', 'footer']
    const at = ids.map((id) => html.indexOf(`id="${id}"`))
    for (const [i, id] of ids.entries()) expect(at[i], id).toBeGreaterThan(-1)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('is dark: a near-black canvas, light ink, and the condensed uppercase headline in the stylesheet', () => {
    const tokens = readFileSync(join(__dirname, '..', '..', 'styles', 'public-tokens.css'), 'utf8')
    expect(tokens).toMatch(/--pub-canvas:\s*#0[0-9a-f]{5}/i)
    expect(tokens).toMatch(/--pub-ink:\s*#f/i)
    const hero = PUB_CSS('hero.module.css')
    const h1 = hero.match(/\.h1\s*\{[^}]*\}/)?.[0] ?? ''
    expect(h1).toMatch(/text-transform:\s*uppercase/)
    expect(h1).toMatch(/font-family:\s*var\(--pub-display\)/)
    expect(tokens).toMatch(/--pub-display:[^;]*Condensed|--pub-display:[^;]*Narrow/)
  })
})

describe('three big media cards', () => {
  it('are Living cards, Nexus CRM and The network, each a title and one short caption, with real media', async () => {
    const cards = blocks(between(await signedOut(), 'highlights', 'group'), 'data-media-card', 'article')
    expect(cards).toHaveLength(3)
    const titles = cards.map((c) => strip(c.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)![1]))
    expect(titles).toEqual(['Living cards', 'Nexus CRM', 'The network'])
    for (const c of cards) {
      expect(c.match(/<p[ >]/g)).toHaveLength(1)
    }
    // a picture only where a distinct file exists (Phill 25/10/2026): the film card and the Nexus card have one, the network card is plain
    expect(cards[0]).toContain('data-film')
    expect(cards[1]).toMatch(/<img[^>]*src="\/cards\/media\/unite-nexus-u-reveal-poster-9x16\.jpg"/)
    expect(cards[2]).not.toContain('<img')
    expect(cards[0]).toContain('data-film')
    expect(cards[0]).toContain('href="/cards"')
    expect(cards[1]).toContain('href="/solutions/intelligence"')
    expect(cards[2]).toContain('href="#group"')
  })
})

describe('six business tiles with the approved logos', () => {
  it('shows the six tiles in order, each a link, with real logos and the NRPG and Trade Hall symbols that are the approved files', async () => {
    const tiles = blocks(await signedOut(), 'data-tile', 'li')
    expect(tiles).toHaveLength(6)
    expect(tiles.map((t) => t.replace(/<[^>]*>/g, ' ').trim().split(/\s+/)[0])).toEqual(['Synthex', 'CARSI', 'Disaster', 'NRPG', 'Trade', 'RestoreAssist'])
    const nrpg = tiles.find((t) => t.includes('NRPG'))!
    expect(tiles.find((t) => t.includes('Trade Hall'))).toContain('src="/landing/logos/trade-hall-floor-symbol-dark.svg"')
    expect(nrpg).toContain('src="/landing/logos/nrpg-reveal-symbol-dark.svg"')
    for (const t of tiles) {
      expect(t).toMatch(/<a [^>]*href="https:\/\//)
      const src = t.match(/<img[^>]*src="([^"]+)"/)?.[1]
      if (src) expect(existsSync(join(PUBLIC, src)), src).toBe(true)
    }
    expect(tiles.filter((t) => !t.includes('<img'))).toHaveLength(0)
  })
})

describe('the living cards gallery', () => {
  it('shows the ten edition films, poster first and labelled AI-generated, with an orange From $249 button', async () => {
    const html = await signedOut()
    const cards = between(html, 'cards', 'pillars')
    const tiles = blocks(cards, 'data-gallery-tile', 'a')
    expect(tiles).toHaveLength(10)
    const names = tiles.map((t) => t.match(/data-gallery-tile="([a-z]+)"/)![1])
    expect(names).toEqual(['blueprint', 'forge', 'constellation', 'ink', 'rewind', 'skyline', 'origami', 'portal', 'restoration', 'magnet'])
    for (const t of tiles) {
      const poster = t.match(/<img[^>]*src="([^"]+)"/)?.[1]
      expect(poster, t).toBeTruthy()
      expect(existsSync(join(PUBLIC, poster!)), poster).toBe(true)
      expect(t).toContain('AI-generated')
      expect(t).not.toContain('<video')
    }
    expect(cards).toMatch(/<a [^>]*href="\/cards\/order"[^>]*>From \$249<\/a>/)
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

describe('four job cards and three step cards', () => {
  it('has the four pillars as image cards, each marked Coming and linked to its page', async () => {
    const jobs = blocks(between(await signedOut(), 'pillars', 'how'), 'data-job', 'article')
    expect(jobs).toHaveLength(4)
    // only the Intelligence card has a picture until the new ones arrive
    expect(jobs.map((j) => j.includes('<img'))).toEqual([false, false, false, true])
    expect(jobs[3]).toContain('/landing/visuals/intelligence.webp')
    for (const [i, p] of PILLARS.entries()) {
      expect(jobs[i]).toContain(`href="${pillarPath(p.slug)}"`)
      expect(jobs[i]).toContain('>Coming<')
      expect(jobs[i].match(/<p[ >]/g)).toHaveLength(1)
    }
  })

  it('has three step cards: pick, send, approve', async () => {
    const steps = blocks(between(await signedOut(), 'how', 'proof'), 'data-step', 'article')
    expect(steps.map((s) => strip(s.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)![1]))).toEqual(['Pick an opener', 'Send your details', 'Approve a proof'])
  })
})

describe('almost no paragraphs', () => {
  it('keeps every card and tile caption to one short line', async () => {
    const html = await signedOut()
    const area = html.slice(html.indexOf('id="highlights"'), html.indexOf('id="proof"'))
    const paragraphs = [...area.matchAll(/<p(?![^>]*data-dr-line)[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]))
    expect(paragraphs.length).toBeGreaterThan(8)
    for (const p of paragraphs) expect(p.length, p).toBeLessThanOrEqual(64)
  })
})

describe('images come from one map, and no file appears twice', () => {
  it('maps every slot to an existing file or to nothing, never repeats a file, and uses intelligence.webp only in the Intelligence card', async () => {
    const { VISUALS } = await import('@/components/public/visuals')
    expect(Object.keys(VISUALS).sort()).toEqual(
      ['conversion', 'experience', 'intelligence', 'network', 'nexus', 'showroom', 'stepApprove', 'stepPick', 'stepSend', 'visibility'].sort(),
    )
    const files = Object.values(VISUALS).flatMap((v) => (v ? [v.src] : []))
    for (const f of files) expect(existsSync(join(PUBLIC, f)), f).toBe(true)
    expect(new Set(files).size, 'a file is mapped to two slots').toBe(files.length)
    expect(Object.entries(VISUALS).filter(([, v]) => v?.src.endsWith('/intelligence.webp')).map(([k]) => k)).toEqual(['intelligence'])
    expect(readdirSync(join(PUBLIC, 'landing', 'visuals')).filter((f) => !/\.webp$/.test(f))).toEqual([])
    for (const f of ['public-home.tsx', 'highlights.tsx', 'pillars-row.tsx', 'how-it-works.tsx', 'proof.tsx']) {
      expect(readFileSync(join(__dirname, '..', '..', 'components', 'public', f), 'utf8'), f).not.toMatch(/\/landing\/visuals\//)
    }
  })

  // Phill 25/10/2026: the same image must not appear in more than one place on the home page.
  // WHAT THIS SCANS: every CONTENT file the home renders, that is each <img>, <video> and <source> tag (src, srcset, poster)
  // in the rendered home markup, plus every url() in the component stylesheets: the film posters, the three media cards,
  // the ten gallery stills, and the job, step and banner pictures. One tag is one reference, so an img with a src and a
  // srcset counts once. A file used by two tags fails, in the same section or in two.
  // WHAT IT SKIPS: files under /landing/logos/ (the business logos and the nav mark). A logo is the brand's mark, not a
  // picture, and may appear once in the tiles and once in any business list (Phill 25/10/2026).
  it('references no image, poster, video or background file more than once on the home page (not twice in one section either)', async () => {
    const html = await signedOut()
    const markers = ['header', 'hero', 'highlights', 'group', 'cards', 'pillars', 'how', 'proof', 'answers', 'contact', 'footer']
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
    expect([...files.keys()].filter((f) => f.includes("/cards/media/edition-")).length, "positive control: the ten gallery posters were scanned").toBe(10)
    const repeated = [...files].filter(([, where]) => where.length > 1).map(([file, where]) => `${file} used ${where.length} times (${where.join(', ')})`)
    expect(repeated).toEqual([])
  })
})

describe('the Margot phone slot in the contact band', () => {
  it('renders nothing while MARGOT_PHONE_NUMBER is unset or not E.164', async () => {
    for (const v of [undefined, '', '  ', '0412345678', '+1', '+61 412 345 678', 'tel:+61412345678']) {
      if (v === undefined) vi.stubEnv('MARGOT_PHONE_NUMBER', '')
      else vi.stubEnv('MARGOT_PHONE_NUMBER', v)
      const html = await signedOut()
      expect(html, String(v)).not.toContain('tel:')
      expect(html, String(v)).not.toContain('Margot')
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
