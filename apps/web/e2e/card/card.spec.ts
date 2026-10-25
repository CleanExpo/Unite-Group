import { expect, test, type Page } from '@playwright/test'

const FAKE = 'http://127.0.0.1:54399'
const OWNER = '/c/phill-mcgurk'
const CLIENT = '/c/acme-plumbing'
const MARGOT_TEL = 'TEL;TYPE=WORK;VALUE=uri:tel:+61491570156'

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
  }))

test.beforeEach(async ({ context, request }) => {
  // Only the local card server may be reached from the browser; anything else would be a leak.
  await context.route(/^https?:\/\/(?!localhost:|127\.0\.0\.1:)/, (route) => route.abort())
  await request.get(`${FAKE}/__reset`)
})

test.describe('layout', () => {
  for (const [path, name] of [[OWNER, 'Phill McGurk'], [CLIENT, 'Sam Example']]) {
    for (const width of [320, 390, 430]) {
      test(`no horizontal scroll at ${width}px on ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
        await expect(page.getByRole('button', { name: 'Send enquiry' })).toBeVisible()
        const o = await noHorizontalScroll(page)
        expect(o.doc).toBeLessThanOrEqual(0)
        expect(o.body).toBeLessThanOrEqual(0)
      })
    }
  }

  test('enquiry form starts above the fold at 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(OWNER)
    const form = page.locator('form', { has: page.getByLabel('Your first name') })
    await expect(form).toBeVisible()
    const box = await form.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeLessThan(844)
    // the first field is reachable without scrolling, not just the form's top edge
    const first = await page.getByLabel('Your first name').boundingBox()
    expect(first!.y + first!.height).toBeLessThanOrEqual(844)
  })
})

test.describe('JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test('card still renders name, Call and Save contact', async ({ page }) => {
    await page.goto(CLIENT)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sam Example')
    await expect(page.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:0491570158')
    await expect(page.getByRole('link', { name: 'Save contact' })).toHaveAttribute('href', `${CLIENT}/contact.vcf`)
  })
})

test.describe('contact.vcf', () => {
  test('owner card: vcard content type and Margot TEL line', async ({ request }) => {
    const res = await request.get(`${OWNER}/contact.vcf`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe('text/vcard; charset=utf-8')
    expect(res.headers()['content-disposition']).toContain('phill-mcgurk.vcf')
    const body = await res.text()
    expect(body).toContain('BEGIN:VCARD')
    expect(body).toContain('FN:Phill McGurk')
    expect(body.split('\r\n')).toContain(MARGOT_TEL)
  })

  test('client card: vcard content type and no Margot line', async ({ request }) => {
    const res = await request.get(`${CLIENT}/contact.vcf`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe('text/vcard; charset=utf-8')
    const body = await res.text()
    expect(body).toContain('FN:Sam Example')
    expect(body).not.toContain('+61491570156')
    expect(body).not.toContain('TYPE=WORK')
    expect(body.match(/^TEL/gm)).toHaveLength(1) // the client's own number only
  })
})

test.describe('enquiry form states', () => {
  test('shows Sending while held, then Saved with a reference', async ({ page, request }) => {
    await page.goto(CLIENT)
    // Wait for React to attach to the form, otherwise the click is a native GET submit. The card
    // exposes no ready signal and test-only changes cannot add one, so this reads React's props key.
    await page.waitForFunction(() => {
      const f = document.querySelector('form')
      return !!f && Object.keys(f).some((k) => k.startsWith('__reactProps'))
    })
    await request.get(`${FAKE}/__hold`)
    await page.getByLabel('Your first name').fill('Alex')
    await page.getByLabel('What do you need?').fill('A quote for a hot water service')
    await page.getByRole('button', { name: 'Send enquiry' }).click()

    await expect(page.getByRole('status')).toHaveText('Sending…')
    await expect(page.getByRole('button', { name: 'Send enquiry' })).toBeDisabled()

    await request.get(`${FAKE}/__release`)
    const saved = page.getByRole('status')
    await expect(saved).toContainText('Saved. Reference: LC-0A1B2C3D4E5F')
    await expect(page.getByRole('button', { name: 'Send enquiry' })).toHaveCount(0)
  })
})
