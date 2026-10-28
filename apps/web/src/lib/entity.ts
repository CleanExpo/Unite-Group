// The single source of the public JSON-LD (spec 2026-10-23, s9): an online-only business, so
// OnlineBusiness and never LocalBusiness. sameAs lists only profiles confirmed as Unite-Group's own
// (UNI-3061, 27/10/2026): the LinkedIn company page, whose listed homepage is unite-group.in.
// Not listed: YouTube @UniteGroupAU (UNI-1747) did not resolve publicly on 27/10/2026, and
// youtube.com/@Unite-Group is a different company (UK student housing).

import { COMPANY_NAME } from '@/lib/legal/company'
import { liveCardTiers } from '@/lib/public-pricing'
import { CONTACT_EMAIL, SITE_URL } from '@/lib/public-site'

export const LOGO_URL = `${SITE_URL}/logos/unite-group-nexus-logo.png`
export const SAME_AS = ['https://www.linkedin.com/company/unite-group-australia'] as const
const ORG_ID = `${SITE_URL}/#organization`

export function organizationJsonLd() {
  return {
    '@type': 'OnlineBusiness',
    '@id': ORG_ID,
    name: COMPANY_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    email: CONTACT_EMAIL,
    sameAs: [...SAME_AS],
    areaServed: [
      { '@type': 'Country', name: 'Australia' },
      { '@type': 'Country', name: 'New Zealand' },
    ],
  }
}

export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Unite Group',
    inLanguage: 'en-AU',
    publisher: { '@id': ORG_ID },
  }
}

/** Offers only for tiers a buyer can pay for now: structured data must not offer what cannot be bought. */
export function cardProductsJsonLd() {
  return liveCardTiers().map((tier) => ({
    '@type': 'Product',
    '@id': `${SITE_URL}/cards/order#${tier.id}`,
    name: `Video business card, ${tier.name}`,
    description: tier.line,
    image: `${SITE_URL}/cards/media/thumbs/edition-signature-thumb.jpg`,
    brand: { '@id': ORG_ID },
    offers: {
      '@type': 'Offer',
      price: String(tier.priceAud),
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/cards/order`,
      seller: { '@id': ORG_ID },
    },
  }))
}

export function entityJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd(), websiteJsonLd(), ...cardProductsJsonLd()],
  }
}
