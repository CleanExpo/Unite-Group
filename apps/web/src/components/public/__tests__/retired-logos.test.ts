import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Phill 25/10/2026: three logo sets are RETIRED and must not exist anywhere in apps/web or be referenced:
//   the NRPG shield (brand-assets/nrpg/01-approved-logo), the gold NRP Restoration badge, and the Trade Hall arches
//   (brand-assets/trade-hall/01-approved-logo).
// Matched three ways, so a rename does not slip through: by file NAME, by a reference to the PATH or name inside any
// text file, and by sha256 of the CONTENT (the source files plus the repo's own copies, hashed before they were deleted).
// This file is skipped by the scan because it names them.

const WEB = join(__dirname, '..', '..', '..', '..')
const RETIRED_SHA256 = new Set([
  '6dbf1d5f2bfcc1429a81db395d824b4e94c3c4d14c4ee363e81febee5e3d6746',
  '1fa16d547b76d1d7e028c59e4a0b943af2c3e7aa0b7fb243a859f4f0875daa41',
  'ae761c2413d9fd20b5b4fc797a74135c741f5d298246e9d577d4faab6db620e6',
  'bc4b34b4974dcb0f63a52a423c849d0e8f6d913ddefd98c0396937d9569addc8',
  'b232b53292be34b5a6184ddd075a9119bc19b3b477b882d44ddfb5b025575f0e',
  '0912ac81e64ff577f4df1d2450c650e5c4371d2f9702a35e64460fde51376ad7',
  'dff4a90e85db0486109a97f2a2d4e0210c5ab47c61730806518b8251639df45b',
  '5d35c0bd8d9ecd0fac5c84cfdeb45d53216f4b53ea22c7fc385162ba3bb477f0',
  'e02640f5d7bd972a052ee79f18f18cd50713d464507717f152e7d47a78eba3b2',
  '8f058adee2c2c79ed140d2032e5d2bf0e8ca07562fbef3809fde2a26f3cff88d',
  '5a661ed9e9ce13a3e7a1ef71143b87bf6ea070822f012507c891ad7cdb232bd6'
])
const RETIRED_NAMES = /^(nrpg-symbol\.svg|nrpg-logo-(light|dark)(-4800)?\.(svg|png)|nrpg\.(png|webp|jpe?g)|nrpg-symbol-2048\.png|trade-hall-symbol\.png|trade-hall-logo-(light|dark)\.(png|webp))$/i
const RETIRED_REFERENCES = /(nrpg|trade-hall)\/01-approved-logo|\/logos\/nrpg\.|nrpg-symbol\.svg|nrpg-logo-(light|dark)|trade-hall-symbol\.(png|webp)|NRP Restoration/i

export function scanRetired(root: string, extraHashes: string[] = [], skip: string[] = []) {
  const hits: string[] = []
  const hashes = new Set([...RETIRED_SHA256, ...extraHashes])
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (!['node_modules', '.next', 'coverage'].includes(e.name)) walk(full)
        continue
      }
      if (skip.includes(full)) continue
      if (RETIRED_NAMES.test(e.name)) hits.push(`name: ${full}`)
      if (hashes.has(createHash('sha256').update(readFileSync(full)).digest('hex'))) hits.push(`content: ${full}`)
      if (/\.(tsx?|css|md|json|txt|svg|mjs)$/i.test(e.name) && statSync(full).size < 400_000 && RETIRED_REFERENCES.test(readFileSync(full, 'utf8'))) hits.push(`reference: ${full}`)
    }
  }
  walk(root)
  return hits
}

describe('retired logos', () => {
  const self = __filename

  it('are absent from public/ and src/: no file by name, by content hash, or referenced', () => {
    expect(scanRetired(join(WEB, 'public'), [], [self])).toEqual([])
    expect(scanRetired(join(WEB, 'src'), [], [self])).toEqual([])
  })

  it('is able to fail: it finds a file by content hash even when renamed, and finds the real files that are there', () => {
    const present = join(WEB, 'public', 'landing', 'logos', 'synthex.webp')
    expect(existsSync(present)).toBe(true)
    const hash = createHash('sha256').update(readFileSync(present)).digest('hex')
    // positive control: pretend the clean Synthex tile were retired, under its own (innocent) name
    expect(scanRetired(join(WEB, 'public', 'landing', 'logos'), [hash]).some((h) => h.startsWith('content:') && h.endsWith('synthex.webp'))).toBe(true)
    // and the name matcher, the reference matcher and the hash list are all non-empty
    expect(RETIRED_NAMES.test('nrpg-symbol.svg')).toBe(true)
    expect(RETIRED_NAMES.test('nrpg-reveal-symbol-dark.svg')).toBe(false)
    expect(RETIRED_REFERENCES.test('/brand-assets/trade-hall/01-approved-logo/x.png')).toBe(true)
    expect(RETIRED_SHA256.size).toBe(11)
  })
})
