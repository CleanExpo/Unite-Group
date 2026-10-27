// Owner card slugs: same shape as card_owners.card_slug, minus words that must never be a card address.
const SLUG_RE = /^[a-z0-9-]{1,64}$/
const RESERVED = new Set(['admin', 'api', 'studio', 'sample'])

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_RE.test(slug) && !RESERVED.has(slug)
}
