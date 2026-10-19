// Unite Group SMB growth packages shown on the public /grow page.
// Prices are AUD and exclude GST. Change them here only; the page and its tests read this list.

export type GrowPackage = {
  id: 'local-growth' | 'website-found' | 'lead-machine'
  name: string
  pitch: string
  setupAud: number
  monthlyAud: number
  includes: string[]
  /** Server-only env var holding the founder's Stripe Payment Link for this package. */
  paymentLinkEnv: string
}

export const GROW_PACKAGES: readonly GrowPackage[] = [
  {
    id: 'local-growth',
    name: 'Local Growth',
    pitch: 'Answer every enquiry and earn more 5-star reviews.',
    setupAud: 495,
    monthlyAud: 397,
    includes: [
      '24/7 AI chat on your website that answers questions and captures every enquiry',
      'Google Business Profile set up and kept active',
      'Review requests to every customer, with a reply to every review',
      'Monthly report: calls, enquiries, reviews',
    ],
    paymentLinkEnv: 'STRIPE_PAYMENT_LINK_LOCAL_GROWTH',
  },
  {
    id: 'website-found',
    name: 'Website + Found',
    pitch: 'A fast new website that search engines and AI assistants can read.',
    setupAud: 2495,
    monthlyAud: 497,
    includes: [
      'Everything in Local Growth',
      '5-page website with chat and lead capture, hosting and care',
      'Structured data and llms.txt so AI assistants can read and cite your business',
      'Before and after speed and visibility scores',
    ],
    paymentLinkEnv: 'STRIPE_PAYMENT_LINK_WEBSITE_FOUND',
  },
  {
    id: 'lead-machine',
    name: 'Lead Machine',
    pitch: 'We run your online marketing every month.',
    setupAud: 3995,
    monthlyAud: 995,
    includes: [
      'Everything in Website + Found',
      'Monthly AI-answer checks (ChatGPT, Perplexity, Google) and fixes',
      'A real page for each service area you actually cover',
      '4 social posts a week, each approved by you before it goes out',
      'One short video each month',
    ],
    paymentLinkEnv: 'STRIPE_PAYMENT_LINK_LEAD_MACHINE',
  },
]

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

/** JSON for an inline <script type="application/ld+json">; every `<` is escaped so no value can close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function formatAud(amount: number): string {
  return AUD.format(amount)
}

/**
 * The checkout link for a package, or null. Only an https Stripe Payment Link is accepted,
 * so an unset, mistyped or foreign URL shows no pay button rather than sending a customer elsewhere.
 */
export function paymentLinkFor(pkg: GrowPackage, env: Record<string, string | undefined> = process.env): string | null {
  const raw = env[pkg.paymentLinkEnv]?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}
