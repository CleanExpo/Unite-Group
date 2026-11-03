import { PROPERTY_KINDS, type ConnectionKind } from './types'

// Checks for what the owner pastes into the setup checklist, so she gets a plain message before saving.
// The database repeats every rule here (portal_connection_link_ok and portal_save_connection in
// 20261102180200_portal_connections.sql); a test pins the host lists below to that migration.

export const VALUE_MAX = 300
export const NOTES_MAX = 500

/** Exact hostnames allowed per kind. GSC and Bing are her own website, so any host is fine for those. */
export const ALLOWED_HOSTS: Record<Exclude<ConnectionKind, 'gsc' | 'bing'>, readonly string[]> = {
  gbp: [
    'g.page', 'maps.app.goo.gl', 'share.google', 'business.google.com', 'maps.google.com', 'maps.google.com.au',
    'www.google.com', 'google.com', 'www.google.com.au', 'google.com.au',
  ],
  facebook: ['www.facebook.com', 'facebook.com', 'm.facebook.com'],
  instagram: ['www.instagram.com', 'instagram.com'],
  linkedin: ['www.linkedin.com', 'linkedin.com', 'au.linkedin.com'],
  youtube: ['www.youtube.com', 'youtube.com', 'm.youtube.com'],
  tiktok: ['www.tiktok.com', 'tiktok.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
}

/** On these Google hosts only a Maps link is a business profile; a search or home link is not. */
export const GOOGLE_MAPS_ONLY = new Set(['www.google.com', 'google.com', 'www.google.com.au', 'google.com.au'])

/** Same shape the database enforces: https and a plain host (no login, port or trailing dot); "@" allowed in the path. */
const HTTPS_SHAPE = /^https:\/\/[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/\S*)?$/
/** A backslash or a "." / ".." segment (plain or %2e): the browser rewrites these, so the path read is not the path pasted. */
const REWRITTEN_PATH = /\\|\/(\.|%2e){1,2}([/?#]|$)/i
const SC_DOMAIN = /^sc-domain:[a-z0-9.-]{1,253}$/
/** A long unbroken run of key-like characters. Notes that look like a key or token are refused. */
export const KEY_SHAPED = /[A-Za-z0-9_+/=-]{32,}/

export type ConnectionValue = { profileUrl: string | null; propertyId: string | null }
type Checked<T> = { ok: true; value: T } | { ok: false; error: string }

export function validateConnectionValue(kind: ConnectionKind, raw: unknown): Checked<ConnectionValue> {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return { ok: false, error: PROPERTY_KINDS.includes(kind) ? 'Paste your website address.' : 'Paste the link to your page.' }
  if (text.length > VALUE_MAX) return { ok: false, error: 'That link is too long. Please check it.' }

  if (kind === 'gsc' && SC_DOMAIN.test(text)) return { ok: true, value: { profileUrl: null, propertyId: text } }

  if (!HTTPS_SHAPE.test(text)) return { ok: false, error: 'Please paste the full link, starting with https://' }
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return { ok: false, error: 'Please paste the full link, starting with https://' }
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return { ok: false, error: 'Please paste the full link, starting with https://' }
  }

  if (kind === 'gsc' || kind === 'bing') return { ok: true, value: { profileUrl: null, propertyId: text } }
  if (REWRITTEN_PATH.test(text)) return { ok: false, error: 'Please paste the link exactly as your browser shows it.' }

  const host = url.hostname.toLowerCase()
  if (!ALLOWED_HOSTS[kind].includes(host)) return { ok: false, error: wrongSiteMessage(kind) }
  if (GOOGLE_MAPS_ONLY.has(host) && !url.pathname.startsWith('/maps')) return { ok: false, error: wrongSiteMessage(kind) }
  if (url.pathname === '/' || url.pathname === '') return { ok: false, error: 'That is the home page. Paste the link to your own page.' }
  return { ok: true, value: { profileUrl: text, propertyId: null } }
}

export function validateNotes(raw: unknown): Checked<string | null> {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return { ok: true, value: null }
  if (text.length > NOTES_MAX) return { ok: false, error: `Please keep notes under ${NOTES_MAX} characters.` }
  if (KEY_SHAPED.test(text)) return { ok: false, error: 'Notes cannot hold a secret, code or key. Please remove it.' }
  return { ok: true, value: text }
}

function wrongSiteMessage(kind: ConnectionKind): string {
  const names: Record<ConnectionKind, string> = {
    gsc: 'Google Search Console', bing: 'Bing', gbp: 'Google Business Profile', facebook: 'Facebook',
    instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', x: 'X',
  }
  return `That link is not a ${names[kind]} link. Please copy it from your ${names[kind]} page.`
}
