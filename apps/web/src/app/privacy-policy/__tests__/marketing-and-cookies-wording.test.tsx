import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import PrivacyPolicyPage from '../page'

const html = renderToStaticMarkup(<PrivacyPolicyPage />).replace(/\s+/g, ' ')
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function section(title: string): string {
  const start = text.indexOf(title)
  expect(start).toBeGreaterThan(-1)
  const next = text.slice(start + title.length).search(/ \d+\. [A-Z]/)
  return next === -1 ? text.slice(start) : text.slice(start, start + title.length + next)
}

// The marketing wording may describe only what is recorded: /api/leads stores the tick box
// as crm_leads.marketing_consent and enrols a lead in a drip sequence only when it is true.
// Neither campaign sender on main adds an unsubscribe link, so the policy must not claim one.
describe('privacy policy marketing email wording', () => {
  it('is grounded in the code it describes', () => {
    const route = readFileSync('src/app/api/leads/route.ts', 'utf8')
    expect(route).toContain('marketing_consent: body.marketing_consent === true')
    expect(route).toContain("{ enrolled: false, reason: 'no_marketing_consent' }")
    for (const sender of ['src/lib/campaigns/drip-processor.ts', 'src/app/api/email/campaigns/[id]/send/route.ts']) {
      const src = readFileSync(sender, 'utf8')
      // If a sender gains an unsubscribe link or header, this fails: update the policy wording with it.
      expect(src).not.toMatch(/unsubscribe_url|unsubscribeUrl|List-Unsubscribe|asm:|href=.*unsubscribe/i)
    }
  })

  it('says what the enquiry records and claims no unsubscribe link, double opt-in or review cycle', () => {
    const s10 = section('10. Website Enquiries and Free Audits')
    expect(s10).toContain('whether you ticked the box agreeing to receive marketing email')
    expect(s10).not.toMatch(/unsubscribe/i)
    expect(s10).not.toMatch(/double opt-in|confirm your subscription/i)
    expect(s10).not.toMatch(/review(ed)? (yearly|annually|regularly)/i)
  })
})

// @supabase/ssr sets its auth cookies with DEFAULT_COOKIE_OPTIONS.maxAge (400 days) and the
// app passes no cookieOptions override (src/lib/supabase/{server,middleware,client}.ts).
describe('privacy policy cookie wording', () => {
  it('matches the cookie lifetime @supabase/ssr actually sets', () => {
    const require = createRequire(import.meta.url)
    const { DEFAULT_COOKIE_OPTIONS } = require('@supabase/ssr/dist/main/utils/constants.js') as {
      DEFAULT_COOKIE_OPTIONS: { maxAge: number }
    }
    expect(DEFAULT_COOKIE_OPTIONS.maxAge).toBe(400 * 24 * 60 * 60)
    for (const f of ['src/lib/supabase/server.ts', 'src/lib/supabase/middleware.ts', 'src/lib/supabase/client.ts']) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/cookieOptions|maxAge/)
    }
  })

  it('says the sign-in cookie is persistent and can last up to 400 days', () => {
    const s8 = section('8. Cookies and Tracking')
    expect(s8).toContain('persistent')
    expect(s8).toContain('up to 400 days')
    expect(s8).not.toMatch(/single session cookie/i)
  })
})
