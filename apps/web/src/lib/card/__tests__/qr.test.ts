import jsQR from 'jsqr'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CardQr } from '@/app/c/[slug]/card-qr'

import { cardAbsoluteUrl } from '../qr'

/** Reads the rendered SVG back into pixels the way a phone camera sees it, then decodes it. */
function decodeSvg(html: string): string | null {
  const svg = html.match(/<svg[^>]*>[\s\S]*<\/svg>/)![0]
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!
  const size = Number(viewBox[1])
  const scale = 8
  const px = size * scale
  const data = new Uint8ClampedArray(px * px * 4).fill(255)
  for (const m of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const x0 = Number(m[1]) * scale
    const y0 = Number(m[2]) * scale
    for (let y = y0; y < y0 + scale; y++) {
      for (let x = x0; x < x0 + scale; x++) {
        const i = (y * px + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }
  return jsQR(data, px, px)?.data ?? null
}

describe('card QR', () => {
  it('encodes the absolute card URL on the canonical site base', () => {
    expect(cardAbsoluteUrl('acme-pty')).toBe('https://unite-group.in/c/acme-pty')
  })

  it('round-trips: the rendered SVG decodes back to the absolute card URL', () => {
    const url = cardAbsoluteUrl('harbour-bakery')
    const html = renderToStaticMarkup(createElement(CardQr, { url, label: 'QR code for this card' }))
    expect(decodeSvg(html)).toBe(url)
  })

  it('each card gets its own payload, nothing appended', () => {
    const a = renderToStaticMarkup(createElement(CardQr, { url: cardAbsoluteUrl('a-card'), label: 'QR' }))
    const b = renderToStaticMarkup(createElement(CardQr, { url: cardAbsoluteUrl('b-card'), label: 'QR' }))
    expect(decodeSvg(a)).toBe('https://unite-group.in/c/a-card')
    expect(decodeSvg(b)).toBe('https://unite-group.in/c/b-card')
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
