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
  nrpg: 'apps/empire/public/logos/nrpg.png',
  restoreassist: 'apps/empire/public/logos/restoreassist.png',
  synthex: 'apps/empire/public/logos/synthex.png',
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
    for (const b of BUSINESSES) if (b.logo) expect(b.logo).toMatch(/^\/landing\/logos\/[a-z-]+\.webp$/)
  })

  it('records provenance in a README beside the files, naming the missing logo', () => {
    const readme = readFileSync(join(LOGOS, 'README.md'), 'utf8')
    for (const src of Object.values(SOURCE)) expect(readme).toContain(src)
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
