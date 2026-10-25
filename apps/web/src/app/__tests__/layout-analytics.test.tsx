import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('geist/font/sans', () => ({ GeistSans: { variable: 'a' } }))
vi.mock('geist/font/mono', () => ({ GeistMono: { variable: 'b' } }))
vi.mock('../globals.css', () => ({}))
vi.mock('@/components/layout/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <script data-testid="vercel-analytics" />,
}))
vi.mock('@/components/analytics/site-tracker', () => ({
  SiteTracker: () => <script data-testid="site-tracker" />,
}))

import RootLayout from '../layout'

// Vercel Web Analytics is not enabled on the project, so an unconditional <Analytics /> makes every page request
// /_vercel/insights/script.js and get a 404. It renders only when VERCEL_WEB_ANALYTICS_ENABLED is exactly '1'.
// The first-party SiteTracker is independent of the flag.

const render = async () => renderToStaticMarkup(await RootLayout({ children: <main>page</main> }))

describe('RootLayout analytics flag (VERCEL_WEB_ANALYTICS_ENABLED)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('omits Vercel Analytics by default and keeps the site tracker', async () => {
    vi.stubEnv('VERCEL_WEB_ANALYTICS_ENABLED', '')
    delete process.env.VERCEL_WEB_ANALYTICS_ENABLED
    const html = await render()
    expect(html).not.toContain('vercel-analytics')
    expect(html).toContain('site-tracker')
  })

  it('renders Vercel Analytics when the flag is exactly 1', async () => {
    vi.stubEnv('VERCEL_WEB_ANALYTICS_ENABLED', '1')
    const html = await render()
    expect(html).toContain('vercel-analytics')
    expect(html).toContain('site-tracker')
  })

  it.each(['true', '0'])('omits Vercel Analytics when the flag is %s', async (value) => {
    vi.stubEnv('VERCEL_WEB_ANALYTICS_ENABLED', value)
    const html = await render()
    expect(html).not.toContain('vercel-analytics')
    expect(html).toContain('site-tracker')
  })
})
