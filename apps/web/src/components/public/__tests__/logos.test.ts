import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const WEB = join(__dirname, '..', '..', '..', '..')
/** Legacy portfolio tile assets kept in public/logos; no longer rendered on the marketing home. */
const PORTFOLIO_TILE_LOGOS = ['/landing/logos/synthex.webp', '/landing/logos/trade-hall-floor-symbol-dark.svg']
const LOGOS = join(WEB, 'public', 'landing', 'logos')

// Every logo served is a resize of a logo file already tracked in the repo. Nothing is drawn or generated.
// Phill 25/10/2026: the final logos. NRPG is "The Reveal" and Trade Hall is "The Floor" (the -dark symbols, for the dark
// site), copied byte for byte from brand-assets under new file names. The earlier shield, gold badge and arches are
// retired (retired-logos.test.ts holds that).
// Phill 26/10/2026 (UNI-3034): the NRPG, CARSI, Disaster Recovery and RestoreAssist logos are removed from public pages.
const distance = (a: Buffer, b: Buffer) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length

const FINAL_LOGOS: Record<string, string> = {
  'trade-hall-floor-symbol-dark.svg': '98e3ffa090bfd7190252f9bffef0026e25de39f6a03b3695283e0fe75bcbb3e1',
}

describe('the final Trade Hall logo', () => {
  it('serves the approved symbol byte for byte, and no NRPG, restoration or other Trade Hall file', () => {
    for (const [f, hash] of Object.entries(FINAL_LOGOS)) {
      expect(createHash('sha256').update(readFileSync(join(LOGOS, f))).digest('hex'), f).toBe(hash)
    }
    expect(readdirSync(LOGOS).filter((f) => /nrpg|trade/i.test(f)).sort()).toEqual(Object.keys(FINAL_LOGOS).sort())
    expect(readdirSync(LOGOS).filter((f) => /carsi|disaster|restore/i.test(f))).toEqual([])
    expect(PORTFOLIO_TILE_LOGOS).toContain('/landing/logos/trade-hall-floor-symbol-dark.svg')
  })
})

// Phill 25/10/2026: Synthex's blurry crop with a thin white border is replaced by the clean navy tile from brand-assets
// (not in the repo), so the served file is pinned by hash: it is a byte-identical copy of synthex-tile-384.webp.
const SYNTHEX_TILE_SHA = '1fc614a138c08aa5793a23d26cd0e0b915481645cb30d5d356303a6046e6e56a'

describe('the approved Synthex tile', () => {
  it('serves the clean Synthex tile byte for byte', () => {
    expect(createHash('sha256').update(readFileSync(join(LOGOS, 'synthex.webp'))).digest('hex')).toBe(SYNTHEX_TILE_SHA)
  })

  it('has no white edge on the Synthex tile: every border pixel is dark navy', async () => {
    const { data, info } = await sharp(join(LOGOS, 'synthex.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const sum = (x: number, y: number) => data[(y * info.width + x) * 3] + data[(y * info.width + x) * 3 + 1] + data[(y * info.width + x) * 3 + 2]
    const edge: number[] = []
    for (let i = 0; i < info.width; i++) edge.push(sum(i, 0), sum(i, info.height - 1))
    for (let j = 0; j < info.height; j++) edge.push(sum(0, j), sum(info.width - 1, j))
    expect(Math.max(...edge)).toBeLessThan(300)
  })
})

describe('portfolio tile logos on disk', () => {
  it('keeps the approved tile files in public/landing/logos', () => {
    for (const logo of PORTFOLIO_TILE_LOGOS) {
      expect(existsSync(join(WEB, 'public', logo)), logo).toBe(true)
      expect(logo).toMatch(/^\/landing\/logos\/[a-z0-9-]+\.(webp|svg)$/)
    }
  })

  it('serves only webp or svg in logos/, with no stray PNG masters', () => {
    const files = readdirSync(LOGOS)
    expect(files.filter((f) => /\.png$/i.test(f))).toEqual([])
    const allowedWebp = new Set(['synthex.webp', 'unite-group-nexus-mark.webp'])
    for (const f of files.filter((n) => n.endsWith('.webp'))) expect(allowedWebp.has(f), f).toBe(true)
  })

  it('records provenance in a README beside the files', () => {
    const readme = readFileSync(join(LOGOS, 'README.md'), 'utf8')
    for (const f of Object.keys(FINAL_LOGOS)) expect(readme).toContain(f)
    expect(readme).not.toMatch(/carsi|disaster|nrpg|restor/i)
    expect(readme).toContain('brand-assets/trade-hall/03-floor')
    expect(readme).toContain('brand-assets/synthex/01-clean-tile/synthex-tile-384.webp')
    expect(readme).toContain('public/logos/unite-group-nexus-logo.png')
    // every source above is a tracked repo path; none is a file fetched from a website
    expect(readme).not.toMatch(/no tracked copy|live header logo/i)
  })
})

describe('the nav mark', () => {
  it('is the Unite-Group Nexus logo file, edge cropped, with transparent corners', async () => {
    const mark = join(LOGOS, 'unite-group-nexus-mark.webp')
    expect(existsSync(mark)).toBe(true)
    const src = join(WEB, 'public', 'logos', 'unite-group-nexus-logo.png')
    const inner = await sharp(src).extract({ left: 8, top: 8, width: 240, height: 240 }).resize(24, 24, { fit: 'fill' }).removeAlpha().raw().toBuffer()
    const served = await sharp(mark).flatten({ background: '#000000' }).resize(24, 24, { fit: 'fill' }).removeAlpha().raw().toBuffer()
    // corners are cut away, so compare the middle of the picture
    const mid = (b: Buffer) => Buffer.from(Array.from({ length: 12 * 12 * 3 }, (_, i) => b[((6 + Math.floor(i / 36)) * 24 + 6 + (Math.floor(i / 3) % 12)) * 3 + (i % 3)]))
    expect(distance(mid(served), mid(inner))).toBeLessThan(12)
    const { channels } = await sharp(mark).metadata()
    expect(channels).toBe(4)
    const corner = await sharp(mark).extract({ left: 0, top: 0, width: 1, height: 1 }).ensureAlpha().raw().toBuffer()
    expect(corner[3]).toBe(0)
  })
})
