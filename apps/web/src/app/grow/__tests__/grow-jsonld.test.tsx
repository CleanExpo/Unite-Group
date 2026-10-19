import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// A package whose copy contains `<` must still reach the page's JSON-LD escaped.
vi.mock('../packages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../packages')>()
  return {
    ...actual,
    GROW_PACKAGES: actual.GROW_PACKAGES.map((pkg, i) => (i === 0 ? { ...pkg, pitch: 'Fast < slow </script><b>x</b>' } : pkg)),
  }
})

import GrowPage from '../page'

describe('/grow JSON-LD', () => {
  it('escapes markup characters from package copy', () => {
    const html = renderToStaticMarkup(createElement(GrowPage))
    const start = html.indexOf('<script type="application/ld+json">') + '<script type="application/ld+json">'.length
    const body = html.slice(start, html.indexOf('</script>', start))
    expect(body).toContain('Fast \\u003c slow \\u003c/script>')
    expect(body).not.toContain('<')
    expect(JSON.parse(body).itemListElement[0].description).toBe('Fast < slow </script><b>x</b>')
  })
})
