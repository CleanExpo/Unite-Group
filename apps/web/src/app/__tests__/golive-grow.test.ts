import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(async () => null) }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
// The main nav is one of the two places allowed to link /grow. Rendering every page without it leaves only the links
// the page itself draws. Its exports stay real, so a constant imported from site-nav.tsx still renders.
vi.mock('@/components/public/site-nav', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/public/site-nav')>()),
  SiteNav: () => null,
}))
// An owner card comes from the database; this one is a fixed sample so the page renders whole.
vi.mock('@/lib/card/published', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/card/published')>()),
  getPublishedCard: async () => ({
    slug: 'sam', displayName: 'Sam Smith', roleTitle: 'Owner', businessName: 'Sam Co',
    email: 'sam@example.com', phone: '+61 400 000 001', serviceArea: 'Brisbane',
  }),
}))

import { metadata as growMeta } from '../grow/page'
import sitemap from '../sitemap'
import { PUBLIC_ROUTES } from '@/lib/public-site'
import { isPublicPath } from '@/proxy'

import RootPage from '../page'
import CardsShowroomPage from '../cards/page'
import CardOrderPage from '../cards/order/page'
import CardTermsPage from '../cards/terms/page'
import CardThanksPage from '../cards/thanks/page'
import PricingPage from '../pricing/page'
import SignaturesPage from '../signatures/page'
import VisibilityPage from '../solutions/visibility/page'
import ExperiencePage from '../solutions/experience/page'
import ConversionPage from '../solutions/conversion/page'
import IntelligencePage from '../solutions/intelligence/page'
import PrivacyPolicyPage from '../privacy-policy/page'
import TermsOfServicePage from '../terms-of-service/page'
import NotFound from '../not-found'
import OwnerCardPage from '../c/[slug]/page'

const APP = join(__dirname, '..')
const SRC = join(APP, '..')
const posix = (p: string) => p.split(sep).join('/')

const noProps = Promise.resolve({})
const sync = (C: () => ReactElement) => async () => createElement(C)
/** Every public page a signed-out visitor can open, rendered as the server sends it (main nav removed by the mock). */
const RENDERS: Record<string, () => Promise<ReactElement>> = {
  '/': () => RootPage(),
  '/cards': sync(CardsShowroomPage),
  '/cards/order': () => CardOrderPage({ searchParams: noProps }),
  '/cards/terms': sync(CardTermsPage),
  '/cards/thanks': () => CardThanksPage({ searchParams: noProps }),
  '/pricing': sync(PricingPage),
  '/signatures': sync(SignaturesPage),
  '/solutions/visibility': sync(VisibilityPage),
  '/solutions/experience': sync(ExperiencePage),
  '/solutions/conversion': sync(ConversionPage),
  '/solutions/intelligence': sync(IntelligencePage),
  '/privacy-policy': sync(PrivacyPolicyPage),
  '/terms-of-service': sync(TermsOfServicePage),
  'not-found': sync(NotFound),
  '/c/x': () => OwnerCardPage({ params: Promise.resolve({ slug: 'sam' }) }),
}
/** Section 10 of the privacy policy names the /grow form as a place it collects data (UNI-3018). That one link only. */
const PRIVACY = '/privacy-policy'

/** Every href in the markup that opens /grow, written any way (absolute, query, fragment). */
const growHrefs = (html: string) =>
  [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((h) => /^(?:https?:\/\/[^/]+)?\/grow(?:[?#/].*)?$/.test(h))

/**
 * True when the source holds a string that could become a /grow link: '/grow', '/grow#form', `${BASE}/grow`, or a bare
 * 'grow' piece of a split string. Import and re-export specifiers are paths to modules, not links, so they are removed.
 */
const hasGrowString = (src: string) =>
  /(["'`])(?:[^"'`\n]*\/)?grow(?:[?#/][^"'`\n]*)?\1/.test(src.replace(/^\s*(?:import|export)\b[^\n]*\bfrom\s*['"][^'"]+['"];?\s*$/gm, ''))

/** The project files a module imports, followed to the end. Packages are not followed. */
function closure(start: string[]): string[] {
  const seen = new Set<string>()
  const resolve = (from: string, spec: string) => {
    const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? join(dirname(from), spec) : null
    if (!base) return null
    for (const p of [base, ...['.ts', '.tsx', '.js', '.mjs'].map((e) => base + e), ...['index.ts', 'index.tsx'].map((i) => join(base, i))]) {
      if (existsSync(p) && statSync(p).isFile()) return p
    }
    return null
  }
  const stack = [...start]
  while (stack.length) {
    const file = stack.pop()!
    if (seen.has(file) || !/\.(tsx?|mjs|js)$/.test(file)) continue
    seen.add(file)
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)) {
      const next = resolve(file, m[1])
      if (next) stack.push(next)
    }
  }
  return [...seen]
}

/** Every page and not-found file under app, with the URL it serves and the layouts that wrap it. */
function publicPages() {
  const out: { key: string; files: string[] }[] = []
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (f === 'node_modules' || f === '__tests__' || f === 'api') continue
      if (statSync(p).isDirectory()) walk(p)
      else if (/^(page|not-found)\.tsx?$/.test(f)) {
        const segs = posix(relative(APP, dir)).split('/').filter(Boolean)
        const route = '/' + segs.filter((s) => !/^\(.*\)$/.test(s)).map((s) => s.replace(/^\[+\.*([^\]]+)\]+$/, 'x')).join('/')
        const layouts = segs.map((_, i) => join(APP, ...segs.slice(0, i + 1), 'layout.tsx')).concat(join(APP, 'layout.tsx')).filter((l) => existsSync(l))
        const notFound = f.startsWith('not-found')
        if (notFound || isPublicPath(route)) out.push({ key: notFound ? (route === '/' ? 'not-found' : `not-found:${route}`) : route, files: [p, ...layouts] })
      }
    }
  }
  walk(APP)
  return out
}

describe('D3: /grow is kept but not offered', () => {
  it('is noindex and nofollow', () => {
    expect(growMeta.robots).toEqual({ index: false, follow: false })
  })

  it('is not in the sitemap or the public route list', () => {
    expect(sitemap().some((e) => new URL(e.url).pathname === '/grow')).toBe(false)
    expect((PUBLIC_ROUTES as readonly string[]).includes('/grow')).toBe(false)
  })

  it('is not advertised in llms.txt', () => {
    const llms = readFileSync(join(SRC, '..', 'public', 'llms.txt'), 'utf8')
    expect(llms).not.toContain('/grow')
  })
})

// Phill 26/10/2026 (UNI-3034): link the live /grow page from the main nav and the home page hero. Only those two.
// Reading source for link spellings missed a constant (review of 3fcdf888) and then a constant imported from an allowed
// file (review of 21cce962). The pages are now checked as a visitor gets them.
describe('D3: /grow is linked only from the main nav and the home hero, on the pages visitors get', () => {
  it('the main nav itself links /grow exactly once (the check can see a real link)', async () => {
    const { SiteNav } = await vi.importActual<typeof import('@/components/public/site-nav')>('@/components/public/site-nav')
    expect(growHrefs(renderToStaticMarkup(createElement(SiteNav)))).toEqual(['/grow'])
  })

  it('every public page is rendered here, or nothing it imports holds a "grow" string', () => {
    const unchecked = publicPages()
      .filter((p) => p.key !== '/grow' && !(p.key in RENDERS))
      .map((p) => ({ p, hits: closure(p.files).filter((f) => hasGrowString(readFileSync(f, 'utf8'))) }))
      .filter(({ hits }) => hits.length > 0)
      .map(({ p, hits }) => `${p.key} (${posix(relative(SRC, p.files[0]))}) reaches ${hits.map((h) => posix(relative(SRC, h))).join(', ')}`)
    expect(unchecked).toEqual([])
    // A render entry for a page that no longer exists is a check of nothing.
    const keys = new Set(publicPages().map((p) => p.key))
    expect(Object.keys(RENDERS).filter((k) => !keys.has(k))).toEqual([])
  })

  it.each(Object.keys(RENDERS).filter((k) => k !== '/' && k !== PRIVACY))('%s draws no /grow link of its own', async (key) => {
    expect(growHrefs(renderToStaticMarkup(await RENDERS[key]()))).toEqual([])
  })

  it('the privacy policy links /grow once, where section 10 says the form collects data', async () => {
    const html = renderToStaticMarkup(await RENDERS[PRIVACY]())
    expect(growHrefs(html)).toHaveLength(1)
    const from = html.indexOf('10. Website Enquiries and Free Audits')
    expect(from).toBeGreaterThan(-1)
    const to = html.indexOf('11.', from)
    expect(to).toBeGreaterThan(from)
    expect(growHrefs(html.slice(from, to))).toHaveLength(1)
  })

  it('the home page draws one /grow link, inside the hero', async () => {
    const html = renderToStaticMarkup(await RENDERS['/']())
    expect(growHrefs(html)).toEqual(['/grow'])
    const [from, to] = [html.indexOf('id="hero"'), html.indexOf('id="start"')]
    expect(from).toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)
    expect(growHrefs(html.slice(from, to))).toEqual(['/grow'])
  })

  it('the link and string detectors see every spelling the reviews planted', () => {
    expect(growHrefs('<a href="/grow">a</a><a href="/grow#form">b</a><a href="https://unite-group.in/grow?x=1&amp;y=2">c</a>')).toHaveLength(3)
    expect(growHrefs('<a href="/growth">a</a><a href="/grower">b</a><a href="/cards">c</a>')).toEqual([])
    expect(hasGrowString("const reviewGrow = '/grow'")).toBe(true)
    expect(hasGrowString('export const GROW = { href: `/grow#form` }')).toBe(true)
    expect(hasGrowString('const href = `${BASE}/grow`')).toBe(true)
    expect(hasGrowString('const href = "/" + "grow"')).toBe(true)
    expect(hasGrowString("import { formatAud } from '@/app/grow/packages'")).toBe(false)
    expect(hasGrowString("<p>Grow your business</p> const growth = 'growth'")).toBe(false)
  })
})
