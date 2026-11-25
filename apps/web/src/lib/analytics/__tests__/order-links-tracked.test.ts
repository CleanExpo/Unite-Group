// UNI-3293: every public link that leads to /cards/order must be a tracked CTA, or the click is invisible
// and the funnel from any page into the order page cannot be measured. Production, 30 days to 07/11/2026:
// 4,088 page views and 6 cta_click rows, because several of these links carried no data-track attribute.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', '..', '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    // /cards/thanks is not in TRACKED_PATHS (a post-purchase page is never measured), so a marker there is inert.
    if (name === '__tests__' || name === 'node_modules' || name === 'api' || name === 'thanks') continue
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

/** Every JSX `<a ...>` opening tag, found by walking to the closing `>` outside any `{}` expression. */
function anchorTags(source: string): string[] {
  const tags: string[] = []
  const re = /<a\s/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    let depth = 0
    let i = m.index
    for (; i < source.length; i++) {
      const c = source[i]
      if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0 && source[i - 1] !== '=') break
    }
    tags.push(source.slice(m.index, i + 1))
  }
  return tags
}

describe('links to /cards/order are tracked CTAs', () => {
  it('every anchor that points at the order page carries data-track="cta" and a label', () => {
    const untracked: string[] = []
    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8')
      for (const tag of anchorTags(source)) {
        const toOrder = tag.includes('/cards/order') || tag.includes('HOME_HERO.primaryHref')
        if (!toOrder) continue
        if (!/data-track="cta"/.test(tag) || !/data-track-label=/.test(tag)) {
          untracked.push(`${relative(SRC, file)}: ${tag.replace(/\s+/g, ' ').slice(0, 90)}`)
        }
      }
    }
    expect(untracked).toEqual([])
  })

  it('the scanner sees the links it is meant to police (positive control)', () => {
    const tags = anchorTags(readFileSync(join(SRC, 'app/cards/page.tsx'), 'utf8')).filter((t) => t.includes('/cards/order'))
    expect(tags.length).toBeGreaterThanOrEqual(3)
  })
})
