import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import { metadata as growMeta } from '../grow/page'
import sitemap from '../sitemap'
import { PUBLIC_ROUTES } from '@/lib/public-site'

const srcDir = join(__dirname, '..', '..')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (f === 'node_modules' || f === '__tests__' || f === 'fixtures') return []
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css|md)$/.test(f) ? [p] : []
  })

/** True when the source links /grow. A quoted '/grow' value counts too: it is a constant waiting to be an href. */
const linksGrow = (src: string) =>
  /href=["'`{]+[^"'`]*\/grow["'`}\s>]/.test(src) ||
  /href=\{`\$\{[A-Z_]+\}\/grow`\}/.test(src) ||
  /(["'`])\/grow(?:[?#][^"'`]*)?\1/.test(src)

describe('D3: /grow is kept but not offered', () => {
  it('is noindex and nofollow', () => {
    expect(growMeta.robots).toEqual({ index: false, follow: false })
  })

  it('is not in the sitemap or the public route list', () => {
    expect(sitemap().some((e) => new URL(e.url).pathname === '/grow')).toBe(false)
    expect((PUBLIC_ROUTES as readonly string[]).includes('/grow')).toBe(false)
  })

  // Phill 26/10/2026 (UNI-3034): link the live /grow page from the main nav and the home page. Only those two.
  it('is linked only from the main nav and the home hero', () => {
    const offenders = walk(srcDir)
      // proxy.ts names /grow in its public-route list, which is access control, not a link.
      .filter((f) => !f.includes(`${join('app', 'grow')}`) && !f.includes('privacy-policy') && f !== join(srcDir, 'proxy.ts'))
      .filter((f) => linksGrow(readFileSync(f, 'utf8')))
      .map((f) => relative(srcDir, f).split(sep).join('/'))
    expect(offenders.sort()).toEqual(['components/public/home/home-page.tsx', 'components/public/site-nav.tsx'])
  })

  // Independent review of 3fcdf888 planted this on /cards/order and the scan missed it.
  it('counts a /grow link built from a constant, and not an import from app/grow', () => {
    expect(linksGrow("const reviewGrow = '/grow'\nexport const A = () => <a href={reviewGrow}>Grow</a>")).toBe(true)
    expect(linksGrow("export const GROW = { href: `/grow#form` }")).toBe(true)
    expect(linksGrow("import { formatAud } from '@/app/grow/packages'")).toBe(false)
  })

  it('is not advertised in llms.txt', () => {
    const llms = readFileSync(join(srcDir, '..', 'public', 'llms.txt'), 'utf8')
    expect(llms).not.toContain('/grow')
  })
})
