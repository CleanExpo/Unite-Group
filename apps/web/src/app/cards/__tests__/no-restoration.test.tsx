import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { createElement } from 'react'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CardsStrip } from '@/components/public/cards-strip'
import { OrderView } from '../order/order-view'
import { EDITIONS, resolveEdition } from '../editions'
import { PAYMENT_ENTITY_LINE } from '../payment-entity'

/**
 * Phill's hard rule (26/10/2026): the Unite-Group website never shows his own businesses or restoration,
 * training, CARSI, Disaster Recovery, NRPG or RestoreAssist content. These are the public card routes.
 * The one allowed mention is CARSI Pty Ltd as the related company that takes card payments (founder decision
 * 26/10/2026). Only these exact payment sentences are removed before the scan, and only where they belong; any
 * other sentence naming CARSI, or a payment sentence anywhere else, still fails.
 */
const BANNED = /restor|training|disaster\s*recovery|nrpg|restoreassist|synthex|trade\s*hall|carsi/i
// Fixed here, not imported: an edit to the production constant must not widen its own exemption.
const APPROVED_PAYMENT_LINE = 'Payment is taken by our related company CARSI Pty Ltd, which appears on your statement.'
const TERMS_PAYMENT_LINES = [
  'Payment is processed by our related company, CARSI Pty Ltd.',
  'Our related company CARSI Pty Ltd handles your payment and sees your payment details.',
]
const ALLOWED_PAYMENT_SENTENCES = [APPROVED_PAYMENT_LINE, ...TERMS_PAYMENT_LINES]

/**
 * Where each payment sentence may appear: beside the pay buttons on /cards/order, beside the Buy Ready-made button on /cards (UNI-3049, #1289), and in the order terms. Keyed by
 * route file for the render scan and by source file for the source scan; every other route and file allows none.
 */
const PAYMENT_ROUTES: Record<string, readonly string[]> = {
  'page.tsx': [APPROVED_PAYMENT_LINE],
  'order/page.tsx': [APPROVED_PAYMENT_LINE],
  'terms/page.tsx': TERMS_PAYMENT_LINES,
}
const PAYMENT_SOURCES: Record<string, readonly string[]> = {
  'app/cards/payment-entity.ts': [APPROVED_PAYMENT_LINE],
  'app/cards/terms/terms-content.ts': TERMS_PAYMENT_LINES,
}

/** The Buy Ready-made block on /cards (its first closing div ends it) and the page without it. */
const buyBlock = (page: string) => {
  const start = page.indexOf('data-buy-now=')
  if (start < 0) return { block: '', rest: page }
  const open = page.lastIndexOf('<div', start)
  const end = page.indexOf('</div>', start) + '</div>'.length
  return { block: page.slice(open, end), rest: page.slice(0, open) + page.slice(end) }
}

const withoutAllowed = (text: string, allowed: readonly string[]) => allowed.reduce((t, s) => t.split(s).join(' '), text)

// Compatibility forms fold to plain letters; every default-ignorable code point (format controls, joiners,
// variation selectors, Hangul fillers) and every combining mark goes.
const fold = (text: string) =>
  text.normalize('NFKD').replace(/[\p{Default_Ignorable_Code_Point}\p{Cf}\p{Mn}\p{Me}]/gu, '')

// Only letters, digits and whitespace stay, so no invisible or punctuation character can sit inside a word.
const lettersOnly = (text: string) => fold(text).replace(/[^\p{L}\p{N}\s]/gu, '')

/** The text a browser shows: parsed like a browser, hidden nodes dropped, text nodes joined by `sep`. */
const visibleText = (html: string, sep: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc
    .querySelectorAll('[hidden], template, script, style, noscript, [style*="display:none"], [style*="display: none"]')
    .forEach((n) => n.remove())
  const parts: string[] = []
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.nodeValue ?? '')
  return parts.join(sep)
}

/**
 * Scans the markup itself (attributes and hidden nodes included) and the visible text twice: text nodes joined
 * directly, so a word split by inline markup joins back up, and joined by spaces, so a phrase split across
 * elements still reads as one. `allowed` names the payment sentences this place may show; the default is none.
 */
const scan = (html: string, allowed: readonly string[] = []) => {
  const views = [
    fold(withoutAllowed(new DOMParser().parseFromString(html, 'text/html').body.innerHTML, allowed)),
    lettersOnly(withoutAllowed(visibleText(html, ''), allowed)),
    lettersOnly(withoutAllowed(visibleText(html, ' '), allowed)),
  ]
  for (const view of views) {
    const hit = BANNED.exec(view)?.[0]
    if (hit) return hit
  }
  return null
}

const online = () => {
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
}

afterEach(() => vi.unstubAllEnvs())

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node)
const order = (edition: string | null) => html(createElement(OrderView, { edition, referrer: null }))

// Next.js treats these file names as routes or route UI in any of its page extensions.
const ROUTE_FILE =
  /^(page|layout|template|default|loading|error|global-error|not-found|forbidden|unauthorized|route|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.(js|jsx|ts|tsx|md|mdx)$/

/** Every Next.js route file under `root` (app/cards by default), found on disk, as a path relative to it. */
const discoverRouteFiles = (root = join(__dirname, '..')) => {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (name === '__tests__' || name === 'node_modules') continue
      if (statSync(path).isDirectory()) walk(path)
      else if (ROUTE_FILE.test(name)) files.push(relative(root, path).split('\\').join('/'))
    }
  }
  walk(root)
  return files.sort()
}

type RouteCase = { params?: Record<string, string>; shows: string }

/**
 * The inputs each card route file is rendered with, and text proving the render really happened. A new route
 * file (any extension, page or layout) fails the guard until it has an entry here; the scan then renders it from
 * its own module.
 */
const ROUTES: Record<string, RouteCase[]> = {
  'page.tsx': [{ shows: 'data-edition="' }],
  'order/page.tsx': [
    { params: {}, shows: 'name="edition"' },
    { params: { edition: 'restoration' }, shows: 'name="edition"' },
  ],
  'terms/page.tsx': [{ shows: 'CARSI Pty Ltd' }],
  'thanks/page.tsx': [
    { params: {}, shows: 'Thank you' },
    { params: { session_id: 'cs_test_a1B2c3' }, shows: 'Thank you' },
  ],
}

/** Imports the route file at `path` itself, so the module rendered is always the one the path names. */
const renderRoute = async (path: string, params?: Record<string, string>) => {
  const mod = await import(/* @vite-ignore */ `../${path}`)
  const props = params ? { searchParams: Promise.resolve(params) } : {}
  return {
    page: html(await mod.default(props)),
    meta: JSON.stringify(mod.metadata ?? null),
    generatesMetadata: typeof mod.generateMetadata === 'function',
  }
}

const APP = join(__dirname, '..', '..')
const SRC = join(APP, '..')
const SOURCE_EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '.mdx', '.md', '/index.tsx', '/index.ts', '/index.js']

/**
 * Every project source file a card route loads, following static and dynamic imports from each route file:
 * client components, their error and sent states, CSS (which can draw text with content:), payment and terms copy.
 * Package imports are skipped; '@/' resolves to src/.
 */
/** What a source file can put on a page: code with its comments removed (strings and JSX text kept), or CSS without comments. */
const shippedText = (file: string, text: string) =>
  file.endsWith('.css')
    ? text.replace(/\/\*[\s\S]*?\*\//g, ' ')
    : ts.transpileModule(text, {
        fileName: file,
        compilerOptions: { removeComments: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
      }).outputText

const reachableSources = (routeFiles: string[]) => {
  const seen = new Set<string>()
  const queue = routeFiles.map((f) => join(APP, 'cards', f))
  while (queue.length) {
    const file = queue.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    const text = readFileSync(file, 'utf8')
    for (const [, spec] of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(file), spec) : null
      if (!base) continue
      const hit = SOURCE_EXTENSIONS.map((ext) => base + ext).find((p) => existsSync(p) && statSync(p).isFile())
      expect(hit, `${relative(SRC, file)} imports ${spec}, which the guard cannot find`).toBeDefined()
      queue.push(hit as string)
    }
  }
  return [...seen].map((f) => relative(SRC, f).split('\\').join('/')).sort()
}

// An unregistered file still gets one bare render and scan; the inventory leg fails it regardless.
const ROUTE_CASES = discoverRouteFiles().flatMap((path) =>
  (ROUTES[path] ?? [{ shows: '' }]).flatMap((c) => [false, true].map((on) => ({ path, on, ...c }))),
)

describe('public card routes carry no restoration or sister-business content', () => {
  it('the route registry lists exactly the route files under /cards, each with at least one render', () => {
    expect(discoverRouteFiles()).toEqual(Object.keys(ROUTES).sort())
    for (const [path, cases] of Object.entries(ROUTES)) expect(cases.length, path).toBeGreaterThan(0)
  })

  it('route discovery finds every route file name and extension Next.js serves', () => {
    const root = mkdtempSync(join(tmpdir(), 'cards-routes-'))
    try {
      // An independent list, so a name dropped from ROUTE_FILE fails here.
      const names = ['page', 'layout', 'template', 'default', 'loading', 'error', 'global-error', 'not-found', 'forbidden',
        'unauthorized', 'route', 'opengraph-image', 'twitter-image', 'icon', 'apple-icon', 'sitemap', 'robots', 'manifest']
      const routeFiles = names.flatMap((n) => ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'].map((e) => `${n}-${e}/${n}.${e}`))
      for (const f of [...routeFiles, 'g/helper.tsx', 'h/page-view.tsx', '__tests__/page.tsx']) {
        mkdirSync(dirname(join(root, f)), { recursive: true })
        writeFileSync(join(root, f), '')
      }
      expect(discoverRouteFiles(root)).toEqual([...routeFiles].sort())
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each(ROUTE_CASES)('/cards/$path params=$params online=$on', async ({ path, params, shows, on }) => {
    if (on) online()
    const { page, meta } = await renderRoute(path, params)
    expect(page, 'positive control: the page rendered').toContain(shows)
    expect(scan(page, PAYMENT_ROUTES[path] ?? [])).toBeNull()
    expect(scan(meta)).toBeNull()
    if (path === 'page.tsx' && on) {
      // The showroom's payment line is allowed only inside the Buy Ready-made block (#1289), once.
      const { block, rest } = buyBlock(page)
      expect(block.split(APPROVED_PAYMENT_LINE).length - 1, 'the payment line sits once beside the Buy button').toBe(1)
      expect(scan(rest), 'no payment line elsewhere on /cards').toBeNull()
    }
  })

  it('the /cards placement check fails when the payment line moves outside the Buy block', () => {
    const page = `<main><div data-buy-now="x"><a>Buy</a><p>${APPROVED_PAYMENT_LINE}</p></div><footer><p>${APPROVED_PAYMENT_LINE}</p></footer></main>`
    expect(scan(buyBlock(page).rest)).toBe('CARSI')
    expect(buyBlock('<main><p>x</p></main>').block).toBe('')
  })

  it('no card route builds its metadata at request time, which the render scan cannot see', async () => {
    for (const path of discoverRouteFiles()) expect((await renderRoute(path, {})).generatesMetadata, path).toBe(false)
  })

  it('the source scan drops comments but keeps strings, JSX text and CSS content', () => {
    const code = "// Synthex kit\n/* restoration */ const u = 'https://x.test/a'; const t = <p>Restoration</p>"
    expect(scan(shippedText('x.tsx', code))).toBe('Restor')
    expect(scan(shippedText('x.tsx', "// Synthex kit\nconst u = 'https://x.test/training'"))).toBe('training')
    expect(scan(shippedText('x.tsx', '// Synthex kit\n/* NRPG */ const a = 1'))).toBeNull()
    expect(scan(shippedText('x.module.css', '/* CARSI */ .a::before { content: "CARSI" }'))).toBe('CARSI')
  })

  it('the payment line on /cards/order is the approved sentence, word for word', () => {
    expect(PAYMENT_ENTITY_LINE).toBe(APPROVED_PAYMENT_LINE)
  })

  it('every source file the card routes load, including client-only form states and CSS', () => {
    const files = reachableSources(discoverRouteFiles())
    // Positive control: the walk reached the client forms whose sent and error states never render on the server.
    for (const f of ['app/cards/order/enquiry-form.tsx', 'app/cards/order/extra-business.tsx', 'app/cards/thanks/intake-form.tsx'])
      expect(files, f).toContain(f)
    for (const f of files) expect(scan(shippedText(f, readFileSync(join(SRC, f), 'utf8')), PAYMENT_SOURCES[f] ?? []), f).toBeNull()
  })

  it('the edition list itself', () => {
    expect(EDITIONS.length, 'positive control: editions were read').toBeGreaterThan(5)
    for (const e of EDITIONS) expect(scan(JSON.stringify(e)), e.name).toBeNull()
  })

  it.each([false, true])('/cards/order with payment links online=%s', (on) => {
    if (on) online()
    const page = order(null)
    expect(page, 'positive control: the picker rendered').toContain('name="edition"')
    // Pay buttons, and the payment line under each, show only when the payment links are set.
    if (on) expect(page, 'positive control: the payment line rendered').toContain(PAYMENT_ENTITY_LINE)
    expect(scan(page, PAYMENT_ROUTES['order/page.tsx'])).toBeNull()
  })

  it('/cards/order?edition=restoration picks nothing and shows nothing restoration', () => {
    expect(resolveEdition('restoration')).toBeNull()
    expect(scan(order('restoration'), PAYMENT_ROUTES['order/page.tsx'])).toBeNull()
  })

  it('the home page film strip', () => {
    const strip = html(createElement(CardsStrip))
    expect(strip, 'positive control: the strip rendered its tiles').toContain('data-gallery-tile="')
    expect(scan(strip)).toBeNull()
  })

  it('only the exact payment sentences are allowed to name CARSI', () => {
    const all = ALLOWED_PAYMENT_SENTENCES
    for (const s of all) expect(scan(`<p>${s}</p>`, all), s).toBeNull()
    expect(scan(`<p>${PAYMENT_ENTITY_LINE}</p><p>Thank you</p>`, PAYMENT_ROUTES['order/page.tsx'])).toBeNull()
    expect(scan('<p>Our related company CARSI Pty Ltd runs courses.</p>', all)).toBe('CARSI')
    expect(scan(`<p>${PAYMENT_ENTITY_LINE} Our CARSI course</p>`, all)).toBe('CARSI')
    expect(scan('<p>Payment is processed by our related company, CARSI Pty Ltd, a training provider.</p>', all)).not.toBeNull()
    expect(scan('<p>CARSI Pty Ltd runs the course.</p>', all)).toBe('CARSI')
    expect(scan('<p title="restoration">x</p>', all)).toBe('restor')
    expect(scan('<p>Book a training course</p>', all)).toBe('training')
  })

  it('a payment sentence is allowed only on /cards/order, the /cards showroom and the terms, never on another card route or file', () => {
    expect(Object.keys(PAYMENT_ROUTES).sort()).toEqual(['order/page.tsx', 'page.tsx', 'terms/page.tsx'])
    expect(Object.keys(PAYMENT_SOURCES).sort()).toEqual(['app/cards/payment-entity.ts', 'app/cards/terms/terms-content.ts'])
    const others = discoverRouteFiles().filter((path) => !PAYMENT_ROUTES[path])
    expect(others, 'positive control: the thank-you page is one of the other routes').toContain('thanks/page.tsx')
    for (const s of ALLOWED_PAYMENT_SENTENCES) {
      expect(scan(`<p>${s}</p>`), s).toBe('CARSI')
      for (const path of others) expect(scan(`<main><p>${s}</p></main>`, PAYMENT_ROUTES[path] ?? []), path).toBe('CARSI')
    }
    // Each place allows only its own sentences: no terms sentence beside the pay buttons, no pay-button line in the terms.
    for (const s of TERMS_PAYMENT_LINES) expect(scan(`<p>${s}</p>`, PAYMENT_ROUTES['order/page.tsx']), s).toBe('CARSI')
    expect(scan(`<p>${APPROVED_PAYMENT_LINE}</p>`, PAYMENT_ROUTES['terms/page.tsx'])).toBe('CARSI')
  })

  it.each([
    ['Disaster', 'Recovery'],
    ['Trade', 'Hall'],
  ])('the scan sees "%s %s" however the markup splits it', (a, b) => {
    for (const shape of [
      `<p>${a} <em>${b}</em></p>`,
      `<p>${a}&nbsp;${b}</p>`,
      `<p>${a}&#160;${b}</p>`,
      `<p>${a}\n   ${b}</p>`,
      `<span>${a}</span><span>${b}</span>`,
      `<p>${a.slice(0, 3)}<b>${a.slice(3)}</b> ${b}</p>`,
      `<p>${a}\u200E ${b}</p>`,
      `<p>${a}<span hidden>x</span>${b}</p>`,
      `<p>${a}-${b}</p>`,
      `<p>${a}\u2800${b}</p>`,
    ])
      expect(scan(shape), shape).not.toBeNull()
  })

  it('the scan sees single banned words split by markup, entities, hidden nodes or invisible characters', () => {
    const shapes = [
      '<p>train<strong>ing</strong></p>',
      '<p>Re<b>store</b>Assist</p>',
      '<p>NR<i>PG</i></p>',
      '<p>Syn&shy;thex</p>',
      '<p>C&#65;RSI</p>',
      '<p>CA&#x52;SI</p>',
      '<span>CAR</span><span hidden>noise</span><span>SI</span>',
      '<span>CAR</span><span style="display:none">noise</span><span>SI</span>',
      '<p>\uFF23\uFF21\uFF32\uFF33\uFF29</p>',
      '<p>res\u2800toration</p>',
      '<p>res.toration</p>',
    ]
    // Every format control, joiner, variation selector or combining mark between two letters.
    for (const mark of ['\u00AD', '\u200B', '\u200C', '\u200D', '\u200E', '\u200F', '\u2060', '\u061C', '\u180E', '\uFEFF', '\uFE0F', '\u034F', '\u0301', '\u3164', '\uFFA0', '\u115F', '\u180B'])
      shapes.push(`<p>res${mark}toration</p>`, `<p>train${mark}ing</p>`, `<p>C${mark}ARSI</p>`)
    for (const shape of shapes) expect(scan(shape), JSON.stringify(shape)).not.toBeNull()
  })
})
