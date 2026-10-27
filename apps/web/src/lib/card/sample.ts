import type { PublicCard } from './published'

/** The sample card's address. Reserved in slug.ts, so no owner can ever publish a real card here. */
export const SAMPLE_CARD_SLUG = 'sample'

/** A made-up business that shows a buyer what their card page looks like. Never read from or written to the database. */
export const SAMPLE_CARD: PublicCard = {
  slug: SAMPLE_CARD_SLUG,
  displayName: 'Sam Sample',
  roleTitle: 'Owner',
  businessName: 'Sample Plumbing Co (SAMPLE)',
  email: 'hello@sample-plumbing.example.invalid',
  phone: null,
  serviceArea: 'Brisbane and Ipswich (example)',
}

export function isSampleSlug(slug: string): boolean {
  return slug === SAMPLE_CARD_SLUG
}
