import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * UNI-2373 H9 — the studio was the last founder surface still painting itself
 * with the retired "Scientific Luxury" palette (OLED Black #050505 + Cyan
 * #00F5FF). That register was retired on the command deck (UNI-2339); the
 * command-deck CSS modules and the globals.css app tokens are the source of
 * truth. Studio has no `.deck` ancestor — there is no layout.tsx in
 * command-centre — so it consumes the app-global tokens, not `--deck-*`,
 * which would silently resolve to nothing here.
 */
const STUDIO_DIR = join(__dirname, '..')
const SOURCES = ['StudioClient.tsx', 'loading.tsx'] as const

// Retired register. Matched case-insensitively so #00f5ff cannot slip back in.
const RETIRED = [/#050505/i, /#00F5FF/i]

describe('studio palette (UNI-2373 H9)', () => {
  for (const file of SOURCES) {
    it(`${file} carries no retired OLED/cyan literals`, () => {
      const source = readFileSync(join(STUDIO_DIR, file), 'utf8')
      for (const pattern of RETIRED) {
        expect(source).not.toMatch(pattern)
      }
    })

    it(`${file} paints from design tokens, not hardcoded neutrals`, () => {
      const source = readFileSync(join(STUDIO_DIR, file), 'utf8')
      // Tailwind's neutral-* ramp assumes a dark ground. Studio previously used
      // it to stay legible on its hardcoded black; on the token canvas those
      // greys are the bug, so they must be gone too.
      expect(source).not.toMatch(/\b(?:bg|text|border)-neutral-\d{3}\b/)
      expect(source).toMatch(/var\(--/)
    })
  }
})
