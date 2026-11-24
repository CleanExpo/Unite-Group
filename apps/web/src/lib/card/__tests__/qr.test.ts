import QRCode from 'qrcode'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CardQr } from '@/app/c/[slug]/card-qr'

import { cardAbsoluteUrl } from '../qr'

const QUIET = 4

/** Dark cells as "row,col" from our rendered SVG: a 1x1 square per module, x is the column, y is the row. */
function ourDarkCells(html: string): Set<string> {
  const cells = new Set<string>()
  for (const m of html.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) cells.add(`${Number(m[2]) - QUIET},${Number(m[1]) - QUIET}`)
  return cells
}

/**
 * Dark cells as "row,col" from the library's own SVG renderer, which draws column as x and row as y. It is a second,
 * independent reader of the same symbol, so a transposed (mirrored) drawing of ours cannot match it. A phone decoder
 * cannot stand in for this: it also reads a mirrored code, which is why a decode round trip alone let the bug through.
 */
async function libraryDarkCells(text: string): Promise<Set<string>> {
  const svg = await QRCode.toString(text, { type: 'svg', margin: QUIET, errorCorrectionLevel: 'M' })
  const d = svg.match(/<path stroke="[^"]*" d="([^"]*)"/)![1]
  const cells = new Set<string>()
  let x = 0
  let y = 0
  for (const t of d.matchAll(/([Mmh])(-?[\d.]+)(?: (-?[\d.]+))?/g)) {
    if (t[1] === 'M') {
      x = Number(t[2])
      y = Number(t[3])
    } else if (t[1] === 'm') {
      x += Number(t[2])
    } else {
      for (let i = 0; i < Number(t[2]); i++) cells.add(`${Math.floor(y) - QUIET},${x + i - QUIET}`)
      x += Number(t[2])
    }
  }
  return cells
}

function transposed(cells: Set<string>): Set<string> {
  return new Set([...cells].map((c) => c.split(',').reverse().join(',')))
}

function renderCard(url: string): string {
  return renderToStaticMarkup(createElement(CardQr, { url, label: 'QR code for this card' }))
}

describe('card QR', () => {
  it('encodes the absolute card URL on the canonical site base', () => {
    expect(cardAbsoluteUrl('acme-pty')).toBe('https://unite-group.in/c/acme-pty')
  })

  it('draws exactly the modules the library draws, column across and row down (not mirrored)', async () => {
    for (const slug of ['harbour-bakery', 'a-card', 'acme-pty', 'northside-plumbing-and-drainage-services']) {
      const url = cardAbsoluteUrl(slug)
      const expected = await libraryDarkCells(url)
      expect(expected.size).toBeGreaterThan(100)
      expect(ourDarkCells(renderCard(url))).toEqual(expected)
    }
  })

  it('has a control that can fail: the library symbol differs from its own mirror image', async () => {
    const url = cardAbsoluteUrl('harbour-bakery')
    const expected = await libraryDarkCells(url)
    expect(transposed(expected)).not.toEqual(expected)
    expect(ourDarkCells(renderCard(url))).not.toEqual(transposed(expected))
  })

  it('agrees with the library matrix read as raw rows, and each card gets its own payload', () => {
    const a = cardAbsoluteUrl('a-card')
    const b = cardAbsoluteUrl('b-card')
    const qr = QRCode.create(a, { errorCorrectionLevel: 'M' })
    const raw = new Set<string>()
    for (let i = 0; i < qr.modules.data.length; i++) {
      if (qr.modules.data[i]) raw.add(`${Math.floor(i / qr.modules.size)},${i % qr.modules.size}`)
    }
    expect(ourDarkCells(renderCard(a))).toEqual(raw)
    expect(ourDarkCells(renderCard(b))).not.toEqual(raw)
  })

  it('is a labelled image with a light quiet zone, inline server HTML with no script', () => {
    const html = renderToStaticMarkup(createElement(CardQr, { url: cardAbsoluteUrl('a-card'), label: 'QR code that opens this card' }))
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="QR code that opens this card"')
    expect(html).toContain('data-card-qr')
    expect(html).not.toContain('<script')
    expect(html).toMatch(/<rect[^>]*fill="#fff"/)
  })
})
