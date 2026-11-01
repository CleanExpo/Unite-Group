import type { Locator, Page } from '@playwright/test'

/**
 * The fixed state list for /cards/order (See-Pick-Tweak, UNI-2996).
 *
 * Every entry is one screenshot per viewport. Interaction states are reached with real input:
 * hover = mouse over, focus = keyboard focus (asserted :focus-visible), pressed = mouse held
 * down (asserted :active), checked = clicked. The coverage check (coverage.visual.ts) fails if
 * any state selector in the page's stylesheets is never on screen during one of these captures,
 * so a new styled state cannot ship without a screenshot here.
 */

export type Kind = 'page' | 'hover' | 'focus' | 'pressed' | 'checked' | 'form'

export type State = {
  id: string
  kind: Kind
  /** Path to load. Default /cards/order. */
  path?: string
  /** The element the state applies to. Not used for kind 'page'. */
  target?: (page: Page) => Locator
  /** Extra steps run after load and before the state is applied (for interaction states, before the target is used). */
  setup?: (page: Page, ctl: FormControl) => Promise<void>
  /** Full-page screenshot instead of the viewport. */
  fullPage?: boolean
}

/** Lets a form state hold or answer the intercepted /api/leads request. No real lead is ever sent. */
export type FormControl = { answer: (status: number, body: unknown) => void; hold: () => void }

// The page's own "Cards" nav was replaced by the shared site header (SiteNav, aria-label "Main"); its Cards link is the nav state.
const nav = (p: Page) => p.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cards', exact: true })
const heroPrimary = (p: Page) => p.getByRole('link', { name: 'Choose your film' })
const heroSecondary = (p: Page) => p.locator('main section').first().getByRole('link', { name: 'See all editions' })
const heroPlay = (p: Page) => p.locator('main section').first().getByRole('button', { name: /^Play / })
const buyPlay = (p: Page) => p.locator('#choose').getByRole('button', { name: /^Play / })
const thumb = (p: Page) => p.getByRole('radio', { name: 'Forge' })
const thumbLabel = (p: Page) => p.locator('label', { has: p.getByRole('radio', { name: 'Forge' }) })
const orderReady = (p: Page) => p.locator('[data-tier="ready"]').getByRole('link')
const nameField = (p: Page) => p.getByLabel('Your name')
const consent = (p: Page) => p.getByRole('checkbox')
const submit = (p: Page) => p.getByRole('button', { name: /Send my request|Sending/ })
const privacy = (p: Page) => p.getByRole('contentinfo').getByRole('link', { name: 'Privacy' })
const orderTerms = (p: Page) => p.getByRole('main').getByRole('link', { name: 'Order terms' })
// Extra-business add-on (UNI-3038): its minus button is disabled at rest, which the full-page captures show.
const extraMore = (p: Page) => p.getByRole('button', { name: 'One more extra business' })
const extraPay = (p: Page) => p.locator('[data-extra-business]').getByRole('link')

/** The pay link renders only once at least one extra business is chosen. */
async function addExtraBusiness(page: Page) {
  await extraMore(page).click()
  await extraPay(page).waitFor()
  await page.mouse.move(1, 1)
}

async function fillRequired(page: Page) {
  await nameField(page).fill('Sam Sample')
  await page.getByLabel('Email', { exact: true }).fill('sam@example.com.au')
}

const interactive = (id: string, target: (p: Page) => Locator, kinds: Kind[]): State[] =>
  kinds.map((kind) => ({ id: `${id}-${kind}`, kind, target }))

export const STATES: State[] = [
  { id: 'page-rest', kind: 'page', fullPage: true },
  { id: 'page-edition-preselected', kind: 'page', path: '/cards/order?edition=forge', fullPage: true },
  {
    id: 'page-sticky-bar',
    kind: 'page',
    setup: async (page) => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.locator('[data-visible="true"]').waitFor()
    },
  },

  ...interactive('nav-link', nav, ['hover', 'focus', 'pressed']),
  ...interactive('hero-primary', heroPrimary, ['hover', 'focus', 'pressed']),
  ...interactive('hero-secondary', heroSecondary, ['hover', 'focus', 'pressed']),
  ...interactive('hero-play', heroPlay, ['hover', 'focus', 'pressed']),
  ...interactive('buy-play', buyPlay, ['hover', 'focus', 'pressed']),
  ...interactive('edition-thumb', thumb, ['focus', 'checked']),
  ...interactive('edition-thumb-label', thumbLabel, ['hover', 'pressed']),
  ...interactive('order-ready', orderReady, ['hover', 'focus', 'pressed']),
  ...interactive('order-terms', orderTerms, ['hover', 'focus', 'pressed']),
  ...interactive('extra-step', extraMore, ['hover', 'focus', 'pressed']),
  ...interactive('extra-pay', extraPay, ['hover', 'focus', 'pressed']).map((s) => ({ ...s, setup: addExtraBusiness })),
  ...interactive('name-field', nameField, ['focus']),
  ...interactive('consent', consent, ['focus', 'checked']),
  ...interactive('submit', submit, ['hover', 'focus', 'pressed']),
  ...interactive('footer-link', privacy, ['hover', 'focus', 'pressed']),

  {
    id: 'form-filled',
    kind: 'form',
    setup: async (page) => {
      await fillRequired(page)
      await page.getByLabel('Business name').fill('Sample Cafe')
      await page.getByLabel('Anything we should know?').fill('Three cards, one for each van.')
      await submit(page).scrollIntoViewIfNeeded()
    },
  },
  {
    id: 'form-sending',
    kind: 'form',
    setup: async (page, ctl) => {
      ctl.hold()
      await fillRequired(page)
      await submit(page).click()
      await page.getByRole('button', { name: 'Sending…' }).waitFor()
      await page.mouse.move(1, 1)
    },
  },
  {
    id: 'form-error',
    kind: 'form',
    setup: async (page, ctl) => {
      ctl.answer(500, { error: 'Fixture error: nothing was sent.' })
      await fillRequired(page)
      await submit(page).click()
      // Next's route announcer is also role="alert" once it mounts; match the form's own one.
      await page.getByRole('alert').filter({ hasText: 'Fixture error: nothing was sent.' }).waitFor()
      await page.mouse.move(1, 1)
    },
  },
  {
    id: 'form-sent',
    kind: 'form',
    setup: async (page, ctl) => {
      ctl.answer(200, { ok: true })
      await fillRequired(page)
      await submit(page).click()
      await page.getByRole('status').waitFor()
      await page.getByRole('status').scrollIntoViewIfNeeded()
      await page.mouse.move(1, 1)
    },
  },
]

/** Source folders whose stylesheets and components the coverage check reads, relative to apps/web. */
export const STYLE_SOURCES = ['src/app/cards/order']
