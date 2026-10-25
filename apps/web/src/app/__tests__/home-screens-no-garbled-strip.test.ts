// @vitest-environment node
import { join } from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

// Founder rule: garbled text is a banned defect. The Experience screen (the /cards Signature reveal tile) used to
// carry a blurred, mirrored strip of unreadable poster text under the "UNITE-GROUP NEXUS" wordmark, the floor
// reflection of the video's frame. Between the wordmark and the tile's bottom border there must now be nothing
// brighter than a dim floor, so no reflection of any text can come back.

const FILE = join(__dirname, '..', '..', '..', 'public', 'screens', 'home', 'job-experience-reveal.webp')

async function pixels() {
  const { data, info } = await sharp(FILE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * 3
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  return { w: info.width, h: info.height, at }
}

describe('Experience screen has no reflection strip under the wordmark', () => {
  it('is dark floor only between the wordmark and the tile bottom border', async () => {
    const { w, h, at } = await pixels()
    // last row of the wordmark: after the logo, the last bright row before four dark rows in a row (anti-aliased edges included)
    const rowMax = (y: number) => {
      let m = 0
      for (let x = 130; x < 510; x++) m = Math.max(m, at(x, y))
      return m
    }
    // the wordmark starts at the first row below the U with a run of near-white pixels
    let start = 340
    while (start < h) {
      let white = 0
      for (let x = 130; x < 510; x++) if (at(x, start) > 200) white++
      if (white >= 20) break
      start++
    }
    expect(start, 'wordmark start found').toBeLessThan(h)
    let wordmarkEnd = -1
    let dark = 0
    for (let y = start; y < h; y++) {
      if (rowMax(y) > 80) {
        wordmarkEnd = y
        dark = 0
      } else if (wordmarkEnd > -1 && ++dark >= 4) break
    }
    expect(wordmarkEnd, 'wordmark found').toBeGreaterThan(300)
    // the tile's bottom border: the first row after the wordmark whose left-inside pixel is border-bright
    let border = -1
    for (let y = wordmarkEnd + 1; y < h; y++) {
      if (at(40, y) > 25) {
        border = y
        break
      }
    }
    expect(border, 'tile bottom border found').toBeGreaterThan(wordmarkEnd)
    let max = 0
    for (let y = wordmarkEnd + 1; y < border; y++) for (let x = 100; x < 520; x++) max = Math.max(max, at(x, y))
    expect(max, `brightest pixel between row ${wordmarkEnd} and ${border}`).toBeLessThanOrEqual(80)
    expect(w).toBe(640)
  })
})
