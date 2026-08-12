// src/__tests__/proxy-matcher.test.ts
//
// The proxy matcher is the ONLY control that distinguishes the founder from
// any other authenticated user, and it is expressed as a single regex. A
// regex is exactly the kind of thing that silently stops covering what you
// think it covers, so it gets a test that fails loudly in both directions.
//
// The defect this locks out (confirmed against production 10/08/2026):
// the static-asset exemption was ungated, so it applied to every path.
//   GET /api/contacts/probe      -> login redirect  (proxy RAN)
//   GET /api/contacts/probe.png  -> bare HTTP 401   (proxy did NOT run)
// `proxy()` never returns 401 — it 307s anonymous callers and 403s
// authenticated non-founders — so that 401 could only have come from the
// route handler itself. Appending `.png` skipped the gate.
//
// Both directions matter and a test for only one is worse than useless:
//   - protected paths MUST match, or the gate is bypassable;
//   - genuine static assets must NOT match, or the login page loses its own
//     CSS/images and every visitor is bounced on the assets themselves.
import { describe, it, expect } from 'vitest'
import { config, isPublicPath } from '../proxy'

/**
 * Next compiles each matcher string into a path regex. We anchor it the same
 * way so the test exercises the real pattern rather than a paraphrase of it —
 * the pattern is imported from proxy.ts, never copied here. If someone edits
 * the matcher, this test sees the edit.
 */
const matchers = config.matcher.map((m) => new RegExp(`^${m}$`))
const isMatched = (pathname: string) => matchers.some((re) => re.test(pathname))

const ASSET_EXTENSIONS = [
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot',
]

describe('proxy matcher', () => {
  describe('protected paths are always gated', () => {
    const protectedPaths = [
      '/api/contacts/probe',
      '/api/health/connectors',
      '/api/agents/runner/claim',
      '/founder/dashboard',
      '/founder/command-centre',
      '/login',
      '/',
    ]

    it.each(protectedPaths)('runs on %s', (p) => {
      expect(isMatched(p)).toBe(true)
    })

    // The regression proper. Every asset extension, against both protected
    // prefixes — enumerated rather than sampled, because the bypass only
    // needed ONE extension to survive.
    it.each(ASSET_EXTENSIONS)(
      'still runs on /api/contacts/probe.%s (asset-suffix bypass)',
      (ext) => {
        expect(isMatched(`/api/contacts/probe.${ext}`)).toBe(true)
      },
    )

    it.each(ASSET_EXTENSIONS)(
      'still runs on /founder/dashboard.%s (asset-suffix bypass)',
      (ext) => {
        expect(isMatched(`/founder/dashboard.${ext}`)).toBe(true)
      },
    )
  })

  describe('genuine static assets are still skipped', () => {
    // Negative control. Without this, "make everything match" would pass the
    // block above while breaking every page's styling.
    const staticPaths = [
      '/logo.png',
      '/images/hero.webp',
      '/fonts/inter.woff2',
      '/favicon.ico',
      '/_next/static/chunks/main.js',
      '/_next/image',
    ]

    it.each(staticPaths)('skips %s', (p) => {
      expect(isMatched(p)).toBe(false)
    })
  })

  // Matching is only half the gate. A path the matcher RUNS on is still waved
  // through if isPublicPath() exempts it, so "the matcher runs on X" must never
  // be read as "X is protected" — see the exemption suite below.

  it('the matcher actually discriminates (guards against a match-everything regex)', () => {
    // If a future edit made the matcher match every path, the protected-path
    // assertions above would all still pass. This asserts the exemption still
    // exists at all, so the test cannot be satisfied by deleting the logic.
    expect(isMatched('/logo.png')).toBe(false)
    expect(isMatched('/api/contacts/probe.png')).toBe(true)
  })
})

// The second half of the gate. PUBLIC_PATHS was compared with a bare
// startsWith, so the '/api/agent' entry (public site chat, UNI-2359) also
// exempted every '/api/agents/*' route — /api/agents/events,
// /api/agents/runner/claim and /api/agents/runner/release are real, exist on
// origin/main, and require auth. The matcher ran on them and isPublicPath then
// let them straight through.
describe('public-path exemption is segment-aware, not prefix-loose', () => {
  describe('genuinely public paths stay exempt', () => {
    const exempt = [
      '/api/agent',
      '/api/agent/chat',
      '/api/auth/callback',
      '/api/health',
      '/api/cron/hub-sweep',
      '/auth/login',
      '/robots.txt',
    ]

    it.each(exempt)('exempts %s', (p) => {
      expect(isPublicPath(p)).toBe(true)
    })
  })

  describe('a sibling route must not inherit a shorter entry’s exemption', () => {
    // Enumerated, not sampled: the collision needed only ONE route to survive.
    const gated = [
      '/api/agents',
      '/api/agents/events',
      '/api/agents/runner/claim',
      '/api/agents/runner/release',
    ]

    it.each(gated)('does NOT exempt %s', (p) => {
      expect(isPublicPath(p)).toBe(false)
    })

    // Negative control. Without it, an isPublicPath() that returned false for
    // everything would satisfy every assertion in this block while breaking
    // OAuth callbacks and the login page — which is why the exempt block above
    // is not optional.
    it('still discriminates (guards against an exempt-nothing regression)', () => {
      expect(isPublicPath('/api/founder/wiki')).toBe(false)
      expect(isPublicPath('/api/auth/callback')).toBe(true)
    })
  })
})
