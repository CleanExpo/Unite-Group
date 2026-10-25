// src/lib/analytics/site-events.ts
// Shared, dependency-free rules for first-party site analytics (UNI-3001).
// Used by BOTH the browser tracker and POST /api/events, so the limits and the
// list of tracked pages live in exactly one place. Keep this file free of
// server-only imports: it ships in the client bundle.
//
// Privacy contract: no cookies, no personal information, no fingerprinting.
// Only the path (never the query string, except utm_*), the referrer HOST, a
// random per-tab session id, a coarse device class and the country the CDN
// already resolved are ever recorded.

export const SITE_EVENT_TYPES = [
  'page_view',
  'cta_click',
  'video_play',
  'video_complete',
  'card_view',
  'form_submit',
  'outbound_click',
] as const

export type SiteEventType = (typeof SITE_EVENT_TYPES)[number]

export const SITE_DEVICES = ['mobile', 'tablet', 'desktop', 'unknown'] as const
export type SiteDevice = (typeof SITE_DEVICES)[number]

export const SITE_EVENT_LIMITS = {
  maxBatch: 20,
  path: 512,
  label: 120,
  referrerHost: 255,
  utm: 100,
  sessionId: 64,
  /** Bytes. A full batch of 20 maximal events is well under this. */
  maxBodyBytes: 32 * 1024,
} as const

/**
 * The public pages the tracker may report on. An allow-list, not a "not
 * /founder" test, so a new private route can never be tracked by accident.
 * A test pins this to PUBLIC_ROUTES in src/lib/public-site.ts.
 */
export const TRACKED_PATHS: readonly string[] = [
  '/',
  '/cards',
  '/cards/order',
  '/cards/terms',
  '/solutions/visibility',
  '/solutions/experience',
  '/solutions/conversion',
  '/solutions/intelligence',
  '/privacy-policy',
  '/terms-of-service',
]

export function isTrackedPath(pathname: string): boolean {
  return TRACKED_PATHS.includes(pathname)
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const
export type UtmKey = (typeof UTM_KEYS)[number]

export type PathParts = { path: string; utm: Partial<Record<UtmKey, string>> }

/**
 * A utm_* value is kept only if it looks like a campaign tag (letters, digits, space, _ - . +),
 * never an email address, phone number or free text. Anything else is dropped, not stored.
 */
export function cleanCampaignTag(value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v || v.length > SITE_EVENT_LIMITS.utm) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.+-]*$/.test(v)) return null
  // Long digit runs look like phone or account numbers; separators are ignored for this test (UNI-3003)
  if (/\d{6,}/.test(v.replace(/[\s_.+-]/g, ''))) return null
  return v
}

/**
 * Reduce whatever the browser sent as a path to a bare pathname plus the three
 * utm_* values. Query strings and fragments are dropped; nothing else survives.
 * Returns null when the input is not a same-site path.
 */
export function splitPath(raw: string): PathParts | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null
  let url: URL
  try {
    url = new URL(raw, 'https://site.invalid')
  } catch {
    return null
  }
  const utm: Partial<Record<UtmKey, string>> = {}
  for (const key of UTM_KEYS) {
    const value = cleanCampaignTag(url.searchParams.get(key))
    if (value) utm[key] = value
  }
  return { path: url.pathname.slice(0, SITE_EVENT_LIMITS.path), utm }
}

/**
 * The host of a referrer URL and nothing else: no path, no query, no port, no
 * credentials. A host that equals one of `ownHosts` is a self-referral and
 * returns null. Anything that is not an http(s) URL returns null.
 */
export function referrerHost(referrer: string | null | undefined, ownHosts: readonly string[] = []): string | null {
  if (!referrer) return null
  let url: URL
  try {
    url = new URL(referrer)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (!host) return null
  if (ownHosts.some((own) => own.toLowerCase().replace(/^www\./, '') === host)) return null
  return host.slice(0, SITE_EVENT_LIMITS.referrerHost)
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|preview|monitor|uptime|curl|wget|python-requests|python-urllib|axios|node-fetch|go-http-client|okhttp|java\/|libwww|httpclient|scrapy|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|vercel-screenshot/i

/** Obvious automated clients. An absent User-Agent counts as automated. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true
  return BOT_PATTERN.test(userAgent)
}

/** A coarse device class from the User-Agent. The User-Agent itself is never stored. */
export function deviceFromUserAgent(userAgent: string | null | undefined): SiteDevice {
  if (!userAgent) return 'unknown'
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) {
    return 'tablet'
  }
  if (/mobi|iphone|ipod|android|windows phone/i.test(userAgent)) return 'mobile'
  if (/windows|macintosh|mac os x|linux|cros|x11/i.test(userAgent)) return 'desktop'
  return 'unknown'
}

/** Two upper-case letters from the CDN's country header, else null. */
export function countryFromHeader(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase()
  return code && /^[A-Z]{2}$/.test(code) ? code : null
}

/** True when the visitor asked not to be measured (Do Not Track or Global Privacy Control). */
export function visitorOptedOut(headers: { get(name: string): string | null }): boolean {
  return headers.get('dnt')?.trim() === '1' || headers.get('sec-gpc')?.trim() === '1'
}
