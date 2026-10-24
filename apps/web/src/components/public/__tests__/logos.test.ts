import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { BUSINESSES, TILES } from '../businesses'

const WEB = join(__dirname, '..', '..', '..', '..')
const REPO = join(WEB, '..', '..')
const LOGOS = join(WEB, 'public', 'landing', 'logos')

// Every logo served is a resize of a logo file already tracked in the repo. Nothing is drawn or generated.
const SOURCE: Record<string, string> = {
  'disaster-recovery': 'apps/empire/public/logos/disaster-recovery.png',
  restoreassist: 'apps/empire/public/logos/restoreassist.png',
  carsi: 'apps/empire/public/logos/carsi.png',
}

/** An 8 by 8 colour signature on white. A source file goes through the same trim and fit that made the served file. */
async function signature(input: string | Buffer, source: boolean) {
  let img = sharp(input).flatten({ background: '#ffffff' })
  if (source) {
    const box = await img.trim({ threshold: 14 }).resize(192, 192, { fit: 'contain', background: '#ffffff' }).png().toBuffer()
    img = sharp(box)
  }
  return img.resize(8, 8, { fit: 'contain', background: '#ffffff' }).raw().toBuffer()
}
const distance = (a: Buffer, b: Buffer) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length

// Phill 25/10/2026: the old round gold NRP Restoration badge is wrong. The approved NRPG logo is the one in
// brand-assets/nrpg/01-approved-logo, copied byte for byte (hashes taken from the source files).
const NRPG_APPROVED: Record<string, string> = {
  'nrpg-symbol.svg': '0912ac81e64ff577f4df1d2450c650e5c4371d2f9702a35e64460fde51376ad7',
  'nrpg-logo-light.svg': 'bc4b34b4974dcb0f63a52a423c849d0e8f6d913ddefd98c0396937d9569addc8',
  'nrpg-logo-dark.svg': '1fa16d547b76d1d7e028c59e4a0b943af2c3e7aa0b7fb243a859f4f0875daa41',
}

describe('the approved NRPG logo, and only that', () => {
  it('serves the three approved svg files byte for byte', () => {
    for (const [f, hash] of Object.entries(NRPG_APPROVED)) {
      expect(createHash('sha256').update(readFileSync(join(LOGOS, f))).digest('hex'), f).toBe(hash)
    }
  })

  it('has no old NRPG badge file, and no source file references one', () => {
    expect(existsSync(join(LOGOS, 'nrpg.webp'))).toBe(false)
    expect(BUSINESSES.find((b) => b.name === 'NRPG')?.logo).toBe('/landing/logos/nrpg-symbol.svg')
    const refs: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(full) }
        else if (/\.(tsx?|css)$/.test(e.name)) for (const m of readFileSync(full, 'utf8').matchAll(/[\w/.-]*nrpg[\w/.-]*\.(?:webp|png|jpe?g|svg)/gi)) refs.push(m[0])
      }
    }
    walk(join(WEB, 'src', 'components', 'public'))
    walk(join(WEB, 'src', 'app'))
    for (const r of refs) expect(Object.keys(NRPG_APPROVED).map((f) => `/landing/logos/${f}`), r).toContain(r)
  })
})

// Phill 25/10/2026: Synthex's blurry crop with a thin white border is replaced by the clean navy tile from brand-assets
// (not in the repo), so the served file is pinned by hash: it is a byte-identical copy of synthex-tile-384.webp.
// Trade Hall has NO logo (Phill rejected the one offered, 25/10/2026): its tile is the name only until he picks another.
const SYNTHEX_TILE_SHA = '1fc614a138c08aa5793a23d26cd0e0b915481645cb30d5d356303a6046e6e56a'

describe('the approved Synthex tile, and Trade Hall with no logo', () => {
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

  it('shows Trade Hall by name only: no logo file, no image, anywhere', () => {
    expect(BUSINESSES.find((b) => b.name === 'Trade Hall')?.logo).toBeUndefined()
    expect(readdirSync(LOGOS).filter((f) => /trade/i.test(f))).toEqual([])
  })
})

describe('business logos come from repo files', () => {
  it('lists a tracked source for every logo, and Trade Hall (no logo file in the repo) as a wordmark', () => {
    const withLogo = TILES.filter((b) => b.logo)
    expect(withLogo.map((b) => b.name)).toEqual(['Synthex', 'CARSI', 'Disaster Recovery', 'NRPG', 'RestoreAssist'])
    expect(TILES.find((b) => !b.logo)?.name).toBe('Trade Hall')
    for (const [name, src] of Object.entries(SOURCE)) {
      execFileSync('git', ['-C', REPO, 'ls-files', '--error-unmatch', src], { stdio: 'pipe' })
      expect(existsSync(join(LOGOS, `${name}.webp`)), name).toBe(true)
    }
  })

  it('each webp matches its source file, and a swapped file would not', async () => {
    const sig = Object.fromEntries(await Promise.all(Object.entries(SOURCE).map(async ([n, src]) => [n, await signature(join(REPO, src), true)])))
    for (const name of Object.keys(SOURCE)) {
      const served = await signature(join(LOGOS, `${name}.webp`), false)
      expect(distance(served, sig[name]), name).toBeLessThan(14)
      // control: the same check must fail against every other business's source
      for (const other of Object.keys(SOURCE).filter((o) => o !== name)) expect(distance(served, sig[other]), `${name} vs ${other}`).toBeGreaterThan(30)
    }
  })

  it('serves only webp, with no PNG, no hotlink and nothing the businesses list does not use', () => {
    const files = readdirSync(LOGOS)
    expect(files.filter((f) => /\.png$/i.test(f))).toEqual([])
    const used = new Set(BUSINESSES.map((b) => b.logo?.split('/').pop()).filter(Boolean))
    for (const f of files.filter((n) => n.endsWith('.webp') && n !== 'unite-group-nexus-mark.webp')) expect(used.has(f), f).toBe(true)
    expect(files.filter((n) => /nrpg/i.test(n)).sort()).toEqual(['nrpg-logo-dark.svg', 'nrpg-logo-light.svg', 'nrpg-symbol.svg'])
    for (const b of BUSINESSES) if (b.logo) expect(b.logo).toMatch(/^\/landing\/logos\/[a-z-]+\.(webp|svg)$/)
  })

  it('records provenance in a README beside the files, naming the missing logo', () => {
    const readme = readFileSync(join(LOGOS, 'README.md'), 'utf8')
    for (const src of Object.values(SOURCE)) expect(readme).toContain(src)
    for (const f of Object.keys(NRPG_APPROVED)) expect(readme).toContain(f)
    expect(readme).toContain('brand-assets/nrpg/01-approved-logo')
    expect(readme).toContain('brand-assets/synthex/01-clean-tile/synthex-tile-384.webp')
    expect(readme).toContain('public/logos/unite-group-nexus-logo.png')
    // every source above is a tracked repo path; none is a file fetched from a website
    expect(readme).not.toMatch(/no tracked copy|live header logo/i)
    expect(readme).toMatch(/Trade Hall[\s\S]*(no logo|missing)/i)
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
