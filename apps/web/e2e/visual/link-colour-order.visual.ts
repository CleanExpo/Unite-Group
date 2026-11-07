import { expect, test, type Page } from '@playwright/test'

/**
 * UNI-3240: public nav, breadcrumb and footer link colours must not depend on stylesheet order.
 *
 * The public shell colours every link with `.page a` (accent). The nav and breadcrumb link rules had
 * the same weight, so whichever stylesheet loaded last won: production showed ink-soft while a CI
 * build of the same code showed orange. CSS modules can land in one chunk or several, so swapping
 * <link> tags proves nothing. This test changes the order of the rules themselves:
 * - "shell last": every compiled `.page a` rule is added again after all other styles;
 * - "reversed": every rule on the page is put back in reverse order.
 * The colours must match the built page and the colours production shows.
 */

const INK_SOFT = 'rgb(201, 204, 214)' // --pub-ink-soft
const INK = 'rgb(244, 241, 236)' // --pub-ink
const HIGHLIGHT = 'rgb(236, 123, 65)' // --pub-highlight

type Order = 'built' | 'shell last' | 'reversed'
type Colours = Record<string, string>

// Each breadcrumb module is used by a different page: marketing-page, legal-shell, pillar-solution.
const PAGES = ['/cards/order', '/privacy-policy', '/solutions/visibility']

const navLink = (page: Page) => page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cards', exact: true })
const whatWeDo = (page: Page) =>
  page.getByRole('navigation', { name: 'Main' }).locator('summary', { hasText: /^What we do$/ }).locator('..')
const menuLink = (page: Page) => whatWeDo(page).locator('a').first()
const crumbLink = (page: Page) => page.locator('main ol[class*="crumbs"] a').first()
const footerLink = (page: Page) => page.locator('footer ul a').first()

async function reorder(page: Page, order: Order): Promise<number> {
  if (order === 'built') return 0
  return page.evaluate((mode) => {
    const all: CSSRule[] = []
    for (const sheet of [...document.styleSheets]) all.push(...sheet.cssRules)
    // The compiled public shell link rules: `.public_page__<hash> a` and its :hover.
    const isShellLink = (r: CSSRule) =>
      r instanceof CSSStyleRule && /^\.public_page__[\w-]+ a(:hover)?$/.test(r.selectorText.trim())
    const style = document.createElement('style')
    if (mode === 'shell last') {
      const shell = all.filter(isShellLink)
      style.textContent = shell.map((r) => r.cssText).join('\n')
      document.head.append(style)
      return shell.length
    }
    if (!all.some(isShellLink)) return 0
    for (const sheet of [...document.styleSheets]) sheet.disabled = true
    style.textContent = all.map((r) => r.cssText).reverse().join('\n')
    document.head.append(style)
    return all.length
  }, order)
}

async function colourOf(page: Page, link: ReturnType<typeof navLink>, hover: boolean): Promise<string> {
  await expect(link, 'the link is on the page').toBeVisible()
  if (hover) await link.hover()
  const colour = await link.evaluate((a) => getComputedStyle(a).color)
  await page.mouse.move(0, 0)
  return colour
}

async function read(page: Page): Promise<Colours> {
  const out: Colours = {
    nav: await colourOf(page, navLink(page), false),
    'nav:hover': await colourOf(page, navLink(page), true),
    crumb: await colourOf(page, crumbLink(page), false),
    'crumb:hover': await colourOf(page, crumbLink(page), true),
    footer: await colourOf(page, footerLink(page), false),
  }
  // The "What we do" dropdown: its links share the nav colour and have their own hover rule.
  const details = whatWeDo(page)
  await details.locator('summary').click()
  out.menu = await colourOf(page, menuLink(page), false)
  out['menu:hover'] = await colourOf(page, menuLink(page), true)
  await details.evaluate((d) => d.removeAttribute('open'))
  return out
}

const EXPECTED: Colours = {
  nav: INK_SOFT,
  'nav:hover': INK,
  crumb: INK_SOFT,
  'crumb:hover': HIGHLIGHT,
  footer: INK_SOFT,
  menu: INK_SOFT,
  'menu:hover': INK,
}

for (const path of PAGES) {
  test(`${path}: nav, breadcrumb and footer link colours do not depend on stylesheet order`, async ({ page }) => {
    // Nothing leaves the machine.
    await page.route('**/*', (route) =>
      new URL(route.request().url()).hostname === '127.0.0.1' ? route.fallback() : route.abort(),
    )
    for (const order of ['built', 'shell last', 'reversed'] as const) {
      const response = await page.goto(path, { waitUntil: 'networkidle' })
      expect(response?.status(), `${path} answers 200`).toBe(200)
      const moved = await reorder(page, order)
      if (order !== 'built') expect(moved, `${order}: the public shell link rule was found and moved`).toBeGreaterThan(0)
      expect(await read(page), `${path}, ${order} order`).toEqual(EXPECTED)
    }
  })
}
