// UNI-2925 — the public /aiw page ships dark behind AIW_PAGE_ENABLED and only
// embeds the site-agent widget when a site key is actually configured.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// notFound() throws to halt render in Next; replicate so the dark path is real.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-nonce': 'test-nonce' })),
}))

import AiwPage from '../page'

const WIDGET = '/widget/nexus-agent.js'

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await AiwPage())
}

describe('/aiw page flag states', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is a 404 unless AIW_PAGE_ENABLED is exactly "true" (dark by default)', async () => {
    for (const value of ['', 'false', '1', 'TRUE']) {
      vi.stubEnv('AIW_PAGE_ENABLED', value)
      vi.stubEnv('NEXT_PUBLIC_AIW_SITE_KEY', 'sk_site_test')
      await expect(AiwPage()).rejects.toThrow('NEXT_NOT_FOUND')
    }
  })

  it('renders the page with no widget embed when the site key is empty', async () => {
    vi.stubEnv('AIW_PAGE_ENABLED', 'true')
    vi.stubEnv('NEXT_PUBLIC_AIW_SITE_KEY', '')
    const html = await renderPage()
    expect(html).toContain('AI websites')
    expect(html).not.toContain(WIDGET)
    expect(html).not.toContain('data-site-key')
    expect(html).not.toContain('chat button')
  })

  it('embeds the widget with the site key and the CSP nonce when both are set', async () => {
    vi.stubEnv('AIW_PAGE_ENABLED', 'true')
    vi.stubEnv('NEXT_PUBLIC_AIW_SITE_KEY', 'sk_site_test')
    const html = await renderPage()
    const tag = html.match(/<script[^>]*nexus-agent\.js[^>]*>/)?.[0]
    expect(tag).toBeDefined()
    expect(tag).toContain(`src="${WIDGET}"`)
    expect(tag).toContain('data-site-key="sk_site_test"')
    // Without the nonce, the proxy's 'strict-dynamic' CSP refuses the script.
    expect(tag).toContain('nonce="test-nonce"')
  })
})
