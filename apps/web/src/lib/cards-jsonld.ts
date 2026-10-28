import { COMPANY_NAME } from '@/lib/legal/company'
import { liveCardTiers } from '@/lib/public-pricing'
import { SITE_URL } from '@/lib/public-site'

import { FAQ_FACTS } from '@/app/cards/showroom-facts'
import { cardVideosJsonLd } from '@/lib/cards-video'

/** Product + Offer JSON-LD for /cards when tiers are purchasable online. */
export function cardsShowroomJsonLd(): Record<string, unknown> | null {
  const tiers = liveCardTiers()
  if (!tiers.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Living business card',
    description:
      'A business card that opens on a short film and ends on your logo. QR code, vCard save, and links to your businesses.',
    brand: { '@type': 'Brand', name: COMPANY_NAME },
    url: `${SITE_URL}/cards`,
    areaServed: { '@type': 'Country', name: 'Australia' },
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: tier.priceAud,
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/cards/order`,
      priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      seller: { '@type': 'Organization', name: COMPANY_NAME, url: SITE_URL },
    })),
  }
}

/** FAQPage built from the questions /cards shows in its visible Questions section, word for word. */
export function cardsFaqJsonLd() {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/cards#faq`,
    mainEntity: FAQ_FACTS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer.join(' ') },
    })),
  }
}

/** The ten card films (VideoObject) and the visible FAQ (FAQPage) for /cards, always present. */
export function cardsPageGraphJsonLd() {
  return { '@context': 'https://schema.org', '@graph': [...cardVideosJsonLd(), cardsFaqJsonLd()] }
}
