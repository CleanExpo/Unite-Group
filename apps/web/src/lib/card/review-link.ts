// Google review link for a card. Pure functions only: no network, no paid Places API.
// Google could change the writereview URL format; this file is the one place that knows it.

/** Same shape the database check enforces on card_profiles.google_place_id. Format only, not proof the place exists. */
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/

/** Google's free Place ID Finder (no API key on our side). Checked 02/11/2026. */
export const PLACE_ID_FINDER_URL = 'https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder'

/** Google's own help page that lists reviews among local ranking factors. Checked 02/11/2026. */
export const GOOGLE_LOCAL_RANKING_HELP_URL = 'https://support.google.com/business/answer/7091'

export function isValidPlaceId(value: unknown): value is string {
  return typeof value === 'string' && PLACE_ID_RE.test(value)
}

/** Trims what an owner pasted; returns null for blank, the trimmed id when well formed, or 'invalid'. */
export function normalisePlaceIdInput(raw: unknown): string | null | 'invalid' {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return 'invalid'
  const trimmed = raw.trim()
  if (!trimmed) return null
  return isValidPlaceId(trimmed) ? trimmed : 'invalid'
}

/** The write-a-review URL for a Place ID, or null when the id is not well formed. Built server-side only. */
export function buildGoogleReviewUrl(placeId: unknown): string | null {
  if (!isValidPlaceId(placeId)) return null
  const url = new URL('https://search.google.com/local/writereview')
  url.searchParams.set('placeid', placeId)
  return url.toString()
}

export type ReviewEventKind = 'button_view' | 'review_tap' | 'qr_review_open' | 'request_link_open'
export type UaClass = 'mobile' | 'desktop' | 'other'

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|headless/i
const MOBILE_RE = /mobi|android|iphone|ipad|ipod/i

/**
 * A coarse device class so tap counts can be split by phone vs desktop. The raw user agent is never stored.
 * Returns 'bot' for link previewers and crawlers, which are not counted at all.
 */
export function classifyUserAgent(ua: string | null | undefined): UaClass | 'bot' | null {
  if (!ua) return null
  if (BOT_RE.test(ua)) return 'bot'
  if (MOBILE_RE.test(ua)) return 'mobile'
  return 'desktop'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A review-request id from the ?q= parameter of a request link, or null. */
export function requestIdFrom(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value.toLowerCase() : null
}
