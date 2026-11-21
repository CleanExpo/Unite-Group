/** Home page marketing copy — single source for the public landing experience. */

// The wordmark, title, agency line and the three links are Phill's (25-26/10/2026, UNI-3017 and UNI-3034).
export const HOME_HERO = {
  wordmark: 'Unite-Group',
  kicker: 'Australia & New Zealand',
  title: 'Every business. One system.',
  lead:
    'Unite Group is an AI marketing agency — film, pages, and follow-up in one stack. Margot is my AI face — the first person you meet.',
  /** Primary path for cold traffic: order flow (see also #start for every path). */
  primaryCta: 'Order a living card',
  primaryHref: '/cards/order',
  secondaryCta: 'See every path',
  secondaryHref: '#start',
  growCta: 'Grow your business',
} as const

/**
 * Short trust strip below the hero — factual only (entity, process, support).
 * Plain, fifth-grade wording that leads with what the customer gets (UNI-3316, UNI-3317).
 * Replies are AI-written, so no "human" or "real person" claims (UNI-3315 item 6).
 */
export const HOME_TRUST_STRIP = {
  eyebrow: 'Why businesses pick us',
  items: [
    {
      title: 'Prices in Australian dollars',
      line: 'You pay in Australian dollars, and we show GST when it applies. We are an Australian company. Our ABN is at the bottom of this page.',
    },
    {
      title: 'You check it first',
      line: 'We send you a private link to check your card or page. Nothing goes live until you say yes.',
    },
    {
      title: 'Clear answers by email',
      line: 'Send us an email. We reply in plain words and tell you the next step. No ticket numbers to chase.',
    },
  ],
} as const

/** Plain explainer above the five steps (UNI-3323). Every <p> in #start stays at 64 characters or fewer. */
export const HOME_START = {
  eyebrow: 'Your next step',
  title: 'Where do you want to start?',
  lead: 'We make films, web pages and follow-up. Pick the step you need.',
} as const

export const HOME_HIGHLIGHTS = {
  eyebrow: 'Spotlight',
  title: 'Three doors into the system',
  lead: 'Film, CRM, and plans — one honest line each.',
  srTitle: 'Featured',
  cards: [
    { title: 'Living cards', href: '/cards', line: 'A short film that lands on your mark, not ours.' },
    { title: 'CRM', href: '/solutions/intelligence', line: 'The inbox we are building around your pipeline.' },
    { title: 'Pricing', href: '/pricing', line: 'Starter plan, signatures, and card tiers — GST where it applies.' },
  ],
} as const

export const HOME_TODAY = {
  eyebrow: 'Live today',
  title: 'What you can use now',
  todayTitle: 'Shipping today',
  comingTitle: 'In the workshop',
} as const

export const HOME_CARDS = {
  eyebrow: 'Signature product',
  title: 'Living cards',
  lead: 'Nine opening films in the showroom. Yours ends on your logo.',
} as const

export const HOME_PILLARS = {
  eyebrow: 'The system',
  title: 'Four jobs your business needs done',
  lead: 'Four pillars — visibility through intelligence.',
} as const

export const HOME_HOW = {
  eyebrow: 'Card orders',
  title: 'How it works',
  lead: 'Three steps from showroom to a link you are proud to hand over.',
} as const

export const HOME_PROOF = {
  eyebrow: 'Showroom',
  title: 'See it before you ask',
  line: 'Watch the card films in our showroom — your logo on the last frame.',
  cta: 'Open the showroom',
} as const

export const HOME_FAQ = {
  eyebrow: 'Straight answers',
  title: 'Questions',
  lead: 'Pricing, hosting, and after you order — no guesswork.',
} as const

export const HOME_CONTACT = {
  eyebrow: 'Contact',
  title: 'Ask a question',
  lead: 'Tell us what you are trying to fix. We reply by email.',
} as const

export const HOME_FOOTER = {
  ctaTitle: 'Start with one win, then grow from there.',
  ctaLead: 'Order a living card today, compare Starter and signatures on pricing, or ask one question — we reply by email.',
  orderCta: 'Order a card',
  contactCta: 'Ask a question',
} as const
