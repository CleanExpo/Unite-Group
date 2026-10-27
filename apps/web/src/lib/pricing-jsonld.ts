import { formatAud } from '@/app/grow/packages'
import { COMPANY_NAME } from '@/lib/legal/company'
import { SIGNATURE_ADDON, STARTER_PLAN } from '@/lib/public-pricing'
import { SITE_URL } from '@/lib/public-site'

export function pricingPageJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Unite Group pricing',
    url: `${SITE_URL}/pricing`,
    description: `Starter plan ${formatAud(STARTER_PLAN.priceAud)} a month and email signatures at ${formatAud(SIGNATURE_ADDON.priceAud)} each.`,
    isPartOf: { '@type': 'WebSite', name: COMPANY_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'OfferCatalog',
      name: 'Unite Group plans and add-ons',
      itemListElement: [
        {
          '@type': 'Offer',
          name: STARTER_PLAN.name,
          price: STARTER_PLAN.priceAud,
          priceCurrency: 'AUD',
          description: STARTER_PLAN.line,
        },
        {
          '@type': 'Offer',
          name: SIGNATURE_ADDON.name,
          price: SIGNATURE_ADDON.priceAud,
          priceCurrency: 'AUD',
          description: SIGNATURE_ADDON.line,
        },
      ],
    },
  }
}
