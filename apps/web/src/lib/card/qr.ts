import QRCode from 'qrcode'

import { SITE_URL } from '@/lib/public-site'

/** The absolute address a card's QR code opens: the site's canonical base plus the card path. */
export function cardAbsoluteUrl(slug: string): string {
  return `${SITE_URL}/c/${slug}`
}

export interface QrSvg {
  /** Side of the square viewBox, in modules, quiet zone included. */
  size: number
  /** One SVG path: a 1x1 square for every dark module. */
  path: string
}

/** Quiet zone in modules. The QR specification asks for four. */
const QUIET = 4

/**
 * The QR code for a text, as plain geometry, with no client script and no network. Error correction M (about 15%)
 * survives a scuffed print or a phone screen glare and still keeps a card URL a small, scannable code.
 */
export function qrSvg(text: string): QrSvg {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  let path = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) path += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
    }
  }
  return { size: n + QUIET * 2, path }
}
