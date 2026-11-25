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

// UNI-3528: a client card with a film plays that film and shows a QR code that opens the card.
test.describe('client film and QR', () => {
  const FILMED = '/c/harbour-bakery'

  test('a filmed card serves its film, and a card with no film shows none', async ({ page }) => {
    const media = page.waitForResponse((r) => r.url().endsWith('/cards/media/edition-constellation.mp4'))
    await page.goto(FILMED)
    const film = page.locator('[data-card-film] video')
    await expect(film).toHaveAttribute('src', '/cards/media/edition-constellation.mp4')
    await expect(film).toHaveAttribute('loop', '')
    expect([200, 206]).toContain((await media).status())
    await page.goto(CLIENT)
    await expect(page.locator('[data-card-film]')).toHaveCount(0)
    await expect(page.locator('video')).toHaveCount(0)
  })

  test('the QR code scans back to the absolute card URL', async ({ page }) => {
    await page.goto(FILMED)
    const svg = page.locator('[data-card-qr] svg')
    await expect(svg).toBeVisible()
    await expect(svg).toHaveAttribute('aria-label', 'QR code that opens this card on your phone')
    // draw the SVG the way a camera sees it, then decode it with a QR reader (jsQR, a dev dependency). jsQR also reads a
    // mirrored code, so this proves the browser draws something scannable; module orientation is pinned in lib/card/__tests__/qr.test.ts.
    await page.addScriptTag({ path: 'node_modules/jsqr/dist/jsQR.js' })
    const decoded = await page.evaluate(async () => {
      const el = document.querySelector('[data-card-qr] svg') as SVGSVGElement
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' }))
      const img = new Image()
      img.src = url
      await img.decode()
      const px = 400
      const canvas = document.createElement('canvas')
      canvas.width = px
      canvas.height = px
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, 0, px, px)
      const data = ctx.getImageData(0, 0, px, px)
      const jsQR = (window as unknown as { jsQR: (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR
      return jsQR(data.data, px, px)?.data ?? null
    })
    expect(decoded).toBe('https://unite-group.in/c/harbour-bakery')
  })

  for (const width of [320, 390]) {
    test(`the filmed card has no horizontal scroll and the QR fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto(FILMED)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Riley Example')
      const o = await noHorizontalScroll(page)
      expect(o.doc).toBeLessThanOrEqual(0)
      expect(o.body).toBeLessThanOrEqual(0)
      const box = await page.locator('[data-card-qr] svg').boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(140)
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    })
  }
})
