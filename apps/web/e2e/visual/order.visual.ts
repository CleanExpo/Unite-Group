import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { STATES, type FormControl, type State } from './states'

/**
 * /cards/order pixel gate: every state in STATES, screenshot compared to the committed one with
 * zero tolerance. While each state is on screen the spec also records which stylesheet state
 * selectors match something, for the coverage check.
 */

const RECORD_DIR = join(__dirname, '..', '..', 'test-results', 'visual-records')
const record: { state: string; matched: string[] }[] = []

test.describe.configure({ mode: 'serial' })

async function load(page: Page, state: State): Promise<FormControl> {
  let held: ((status: number, body: unknown) => void) | null = null
  let reply: { status: number; body: unknown } | null = null
  const ctl: FormControl = {
    answer: (status, body) => (reply = { status, body }),
    hold: () => (reply = null),
  }
  // Nothing leaves the machine: no Stripe, no fonts or media from elsewhere, no real lead.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' ? route.fallback() : route.abort()
  })
  await page.route('**/api/leads', async (route) => {
    if (!reply) {
      await new Promise<void>((resolve) => (held = () => resolve()))
      return route.abort()
    }
    return route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) })
  })
  page.on('close', () => held?.(0, null))

  const path = state.path ?? '/cards/order'
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  expect(response?.status(), 'the order page must answer 200').toBe(200)
  expect(new URL(page.url()).pathname).toBe('/cards/order')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get your own living card')
  await page.evaluate(() => document.fonts.ready)
  const broken = await page.evaluate(() =>
    [...document.images].filter((img) => !img.complete || img.naturalWidth < 2).map((img) => img.currentSrc || img.src),
  )
  expect(broken, 'every image decoded at its real size').toEqual([])
  // complete is not painted: wait for every image to be ready to draw, or a capture can catch it mid-decode (UNI-3038).
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => undefined))))
  return ctl
}

/**
 * Every stylesheet state selector that matches an element the screenshot can show right now:
 * rendered (not display:none, visibility:hidden or opacity 0, itself or an ancestor), with a
 * non-empty box that intersects the captured area (the viewport, or the whole page for
 * full-page states). A match that is hidden or off-screen is not coverage.
 */
async function matchedStateSelectors(page: Page, fullPage: boolean): Promise<string[]> {
  return page.evaluate((fullPage) => {
    const out = new Set<string>()
    const area = fullPage
      ? { left: -window.scrollX, top: -window.scrollY, right: document.documentElement.scrollWidth - window.scrollX, bottom: document.documentElement.scrollHeight - window.scrollY }
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
    const onScreen = (el: Element) => {
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false
      return [...el.getClientRects()].some(
        (r) => r.width > 0 && r.height > 0 && r.right > area.left && r.left < area.right && r.bottom > area.top && r.top < area.bottom,
      )
    }
    const marker = /(?<!:):(hover|focus|focus-visible|focus-within|active|checked|disabled|enabled|invalid|user-invalid|valid|user-valid|indeterminate|placeholder-shown|target|visited|open|popover-open|autofill|read-only|read-write|required|optional)\b|\[(?:data|aria)-/
    const split = (list: string) => {
      const parts: string[] = []
      let depth = 0
      let cur = ''
      for (const ch of list) {
        if (ch === '(' || ch === '[') depth++
        if (ch === ')' || ch === ']') depth--
        if (ch === ',' && depth === 0) {
          parts.push(cur.trim())
          cur = ''
        } else cur += ch
      }
      if (cur.trim()) parts.push(cur.trim())
      return parts
    }
    const walk = (rules: CSSRuleList) => {
      for (const rule of [...rules]) {
        if (rule instanceof CSSMediaRule) {
          if (matchMedia(rule.media.mediaText).matches) walk(rule.cssRules)
        } else if (rule instanceof CSSSupportsRule || rule instanceof CSSLayerBlockRule) {
          walk(rule.cssRules)
        } else if (rule instanceof CSSStyleRule) {
          for (const part of split(rule.selectorText)) {
            if (!marker.test(part)) continue
            try {
              if ([...document.querySelectorAll(part)].some(onScreen)) out.add(part)
            } catch {
              // A selector this browser cannot query is never counted as covered.
            }
          }
        }
      }
    }
    for (const sheet of [...document.styleSheets]) {
      try {
        walk(sheet.cssRules)
      } catch {
        // Cross-origin sheets are not ours.
      }
    }
    return [...out]
  }, fullPage)
}

async function apply(page: Page, state: State, ctl: FormControl) {
  await state.setup?.(page, ctl)
  if (state.kind === 'page' || state.kind === 'form') return
  const el = state.target!(page)
  await expect(el).toHaveCount(1)
  await el.evaluate((node) => node.scrollIntoView({ block: 'center' }))
  switch (state.kind) {
    case 'hover':
      await el.hover()
      expect(await el.evaluate((n) => n.matches(':hover'))).toBe(true)
      break
    case 'focus':
      await page.keyboard.press('Shift')
      await el.focus()
      expect(await el.evaluate((n) => n.matches(':focus-visible')), 'keyboard focus shows').toBe(true)
      break
    case 'pressed':
      await el.hover()
      await page.mouse.down()
      expect(await el.evaluate((n) => n.matches(':active')), 'held down').toBe(true)
      break
    case 'checked':
      await el.check()
      await page.mouse.move(1, 1)
      await el.evaluate((n) => (n as HTMLElement).blur())
      expect(await el.isChecked()).toBe(true)
      break
  }
}

for (const state of STATES) {
  test(state.id, async ({ page }) => {
    const ctl = await load(page, state)
    await apply(page, state, ctl)
    record.push({ state: state.id, matched: await matchedStateSelectors(page, state.fullPage ?? false) })
    await expect(page).toHaveScreenshot(`${state.id}.png`, { fullPage: state.fullPage ?? false })
    if (state.kind === 'pressed') {
      // Release away from the element so the press never becomes a click or a navigation.
      await page.mouse.move(1, 1)
      await page.mouse.up()
    }
  })
}

test.afterAll(({}, testInfo) => {
  mkdirSync(RECORD_DIR, { recursive: true })
  writeFileSync(
    join(RECORD_DIR, `${testInfo.project.name}.json`),
    JSON.stringify({ project: testInfo.project.name, states: STATES.map((s) => s.id), record }, null, 2),
  )
})
