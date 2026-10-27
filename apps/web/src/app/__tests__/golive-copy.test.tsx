import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(async () => null) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { Answers } from '@/components/public/answers'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'
import { PublicHome } from '@/components/public/public-home'
import { PillarPage } from '@/components/public/pillar-page'
import { CARD_ORDER_TERMS } from '../cards/terms/terms-content'
import PrivacyPolicyPage from '../privacy-policy/page'
import TermsOfServicePage from '../terms-of-service/page'
import NotFound from '../not-found'

const text = (el: React.ReactElement) =>
  renderToStaticMarkup(el).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ')

describe('D2: the legal pages no longer say the site is not public', () => {
  it.each([
    ['terms of service', () => text(<TermsOfServicePage />)],
    ['privacy policy', () => text(<PrivacyPolicyPage />)],
  ])('%s opens by saying what the public site is', (_n, render) => {
    const t = render()
    expect(t).not.toMatch(/not a public service|not offered to the general public|not intended for use by the general public|not a public-facing/i)
    expect(t).toMatch(/public (website|site)/i)
    expect(t).toMatch(/Living Business Card/)
  })

  it('terms of service points to the card order terms', () => {
    expect(renderToStaticMarkup(<TermsOfServicePage />)).toContain('href="/cards/terms"')
  })

  it('footer links to both the general terms and the card terms', () => {
    const html = renderToStaticMarkup(<SiteFooter />)
    expect(html).toContain('href="/terms-of-service"')
    expect(html).toContain('href="/cards/terms"')
  })
})

describe('D5: the FAQ hosting answer is the card terms', () => {
  it('states 12 months and no monthly fee, and no longer says no term is set', () => {
    const t = text(<Answers />)
    expect(t).not.toMatch(/not set a hosting term/i)
    expect(t).toMatch(/12 months/)
    expect(t).toMatch(/no monthly fee/i)
    expect(CARD_ORDER_TERMS).toContain('We host your card for 12 months from the day it goes live. There is no monthly fee.')
  })
})

describe('D21: home section titles stay honest', () => {
  it('keeps the proof, how and questions sections on the home page', () => {
    const home = renderToStaticMarkup(<PublicHome />)
    expect(home).not.toMatch(/>Results<|>About<|>Resources</)
    for (const title of ['See it before you ask', 'How it works', 'Questions']) {
      expect(home).toContain(`>${title}<`)
    }
  })

  it('does not offer Explore or Email us in the main nav', () => {
    const html = renderToStaticMarkup(<SiteNav />)
    expect(html).not.toContain('>Explore<')
    expect(html).not.toMatch(/href="mailto:contact@unite-group.in"[^>]*>\s*Email us/)
  })
})

describe('D24: skip-to-content link', () => {
  it('is the first link on the home page and its target exists', () => {
    const html = renderToStaticMarkup(<PublicHome />)
    expect(html.indexOf('href="#main"')).toBeGreaterThan(-1)
    expect(html.indexOf('href="#main"')).toBeLessThan(html.indexOf('href="/"'))
    expect(html).toMatch(/<main[^>]*id="main"/)
    expect(html).toMatch(/href="#main"[^>]*>Skip to content</)
  })

  it('is on pillar pages too', () => {
    const html = renderToStaticMarkup(<PillarPage slug="visibility" />)
    expect(html).toContain('href="#main"')
    expect(html).toMatch(/<main[^>]*id="main"/)
  })
})

describe('D11: the not-found page is in house style', () => {
  it('uses the public site shell and offers a way back, with no utility-class styling', () => {
    const html = renderToStaticMarkup(<NotFound />)
    expect(html).toMatch(/Page not found/i)
    expect(html).toContain('href="/"')
    expect(html).not.toMatch(/class="[^"]*(min-h-screen|bg-\[|flex items-center)/)
    expect(html).toContain('<header')
    expect(html).toContain('<footer')
  })
})
