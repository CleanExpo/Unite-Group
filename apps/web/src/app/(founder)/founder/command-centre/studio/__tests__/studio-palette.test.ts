import { readdirSync, readFileSync } from 'node:fs'
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
 *
 * The first version of this guard hardcoded two filenames and matched only the
 * hex forms. Independent review demonstrated two live bypasses: the cyan
 * reintroduced as `rgb(0,245,255)`, and page.tsx — a sibling the SOURCES list
 * never named — still carrying `text-neutral-400`. Both returned a green
 * suite. So this guard now enumerates the directory rather than a list, and
 * matches the retired colours by VALUE in every CSS notation.
 */
const STUDIO_DIR = join(__dirname, '..')

/** Every source file in the studio route, discovered — never hand-listed. */
function studioSources(): string[] {
  return readdirSync(STUDIO_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => e.name)
}

/**
 * The retired colours in every notation that reaches CSS: hex (3/6/8-digit,
 * either case), rgb()/rgba() with arbitrary spacing, and the Tailwind
 * arbitrary-value wrappers that carry them.
 */
const RETIRED_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'OLED black hex (#050505)', pattern: /#050505/i },
  { label: 'retired cyan hex (#00F5FF)', pattern: /#00F5FF/i },
  { label: 'OLED black rgb()', pattern: /rgba?\(\s*5\s*,\s*5\s*,\s*5\s*[,)]/i },
  { label: 'retired cyan rgb()', pattern: /rgba?\(\s*0\s*,\s*245\s*,\s*255\s*[,)]/i },
]

describe('studio palette (UNI-2373 H9)', () => {
  it('discovers every studio source file, so a new sibling cannot slip the guard', () => {
    const sources = studioSources()
    // Fails loudly if the route is emptied or renamed out from under the guard.
    expect(sources.length).toBeGreaterThanOrEqual(3)
    expect(sources).toContain('StudioClient.tsx')
    expect(sources).toContain('loading.tsx')
    expect(sources).toContain('page.tsx')
  })

  for (const file of studioSources()) {
    it(`${file} carries no retired OLED/cyan colour in any notation`, () => {
      const source = readFileSync(join(STUDIO_DIR, file), 'utf8')
      for (const { label, pattern } of RETIRED_PATTERNS) {
        expect(source, `${file} reintroduced the ${label}`).not.toMatch(pattern)
      }
    })

    it(`${file} paints from design tokens, not raw Tailwind colour ramps`, () => {
      const source = readFileSync(join(STUDIO_DIR, file), 'utf8')
      // Tailwind's numbered ramps assume their own ground. Studio previously
      // used neutral-* to stay legible on hardcoded black; on the token canvas
      // those greys drop to ~2.5:1 and are the bug, not the fix. text-white on
      // the accent fill is the same mistake in the other direction (3.30:1).
      expect(source).not.toMatch(
        /\b(?:bg|text|border)-(?:neutral|gray|zinc|slate|stone|amber|cyan)-\d{2,3}\b/,
      )
      expect(source).not.toMatch(/\b(?:bg|text|border)-white\b/)
    })
  }
})
