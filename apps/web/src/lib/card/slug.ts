// Owner card slugs: same shape as card_owners.card_slug, minus words that must never be a card address.
const SLUG_RE = /^[a-z0-9-]{1,64}$/
const RESERVED = new Set(['admin', 'api', 'studio', 'sample'])

/** A staff card's address (UNI-3146): s- then 16 hex characters, the same shape the database enforces. */
const STAFF_SLUG_RE = /^s-[0-9a-f]{16}$/

export function isStaffSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && STAFF_SLUG_RE.test(slug)
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_RE.test(slug) && !RESERVED.has(slug)
}
