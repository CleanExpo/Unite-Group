/** Home page marketing copy — single source for the public landing experience. */

// The wordmark, title, agency line and the three links are Phill's (25-26/10/2026, UNI-3017 and UNI-3034).
export const HOME_HERO = {
  wordmark: 'Unite-Group',
  kicker: 'Australia & New Zealand',
  title: 'Every business. One system.',
  lead:
    'Unite Group is an AI marketing agency — film, pages, and follow-up in one stack. Margot is the AI face your customers meet first.',
  /** Primary path for cold traffic: order flow (see also #start for every path). */
  primaryCta: 'Order a living card',
  primaryHref: '/cards/order',
  secondaryCta: 'See every path',
  secondaryHref: '#start',
  growCta: 'Grow your business',
} as const

/** Short trust strip below the hero — factual only (entity, process, support). */
export const HOME_TRUST_STRIP = {
  eyebrow: 'Why teams choose us',
  items: [
    {
      title: 'Australian operator',
      line: 'AUD pricing, GST called out, and delivery from an Australian company — ABN on the footer, no offshore mystery invoice.',
    },
    {
      title: 'Approve before it goes live',
      line: 'Every card and public page ships behind a private proof link. Nothing publishes until you say yes.',
    },
    {
      title: 'Direct email, not a ticket maze',
      line: 'You write to a real inbox. We answer in plain language with the next step, not a template number.',
    },
  ],
} as const

export const HOME_START = {
  eyebrow: 'Orientation',
  title: 'Pick the outcome you need first',
  lead: 'Five paths into the same system — start with what matters now.',
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
