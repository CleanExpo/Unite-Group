// One source for the public home, the four pillar pages, the sitemap and llms.txt (spec 2026-10-23, s9).
// Nothing here may name the internal agency: this module feeds public routes only.

import { formatAud } from '@/app/grow/packages'
import { cardFromAud } from '@/lib/public-pricing'

export const SITE_URL = 'https://unite-group.in'
export const CONTACT_EMAIL = 'contact@unite-group.in'

export type PillarFaq = { q: string; a: string }

export type Pillar = {
  slug: 'visibility' | 'experience' | 'conversion' | 'intelligence'
  name: string
  /** The line on the home pillars row. */
  line: string
  /** The one job of the pillar page. */
  headline: string
  intro: string
  /** What the pillar will do. Every pillar is "Coming" until it ships. */
  will: readonly string[]
  /** Title tag — keyword-led, still honest about Live vs Coming. */
  seoTitle: string
  /** Meta description — search snippet, 150–160 chars where possible. */
  seoDescription: string
  /** Primary query intent this page answers (internal + content brief). */
  searchIntent: string
  audience: string
  problems: readonly string[]
  outcomes: readonly string[]
  faq: readonly PillarFaq[]
}

export const PILLARS: readonly Pillar[] = [
  {
    slug: 'visibility',
    name: 'Visibility',
    line: 'Be found when people, and AI assistants, look for what you do.',
    headline: 'Be found when people ask.',
    intro:
      'Visibility is how accurately your business shows up in Google, maps, and AI answers — with one source of truth, not scattered listings.',
    will: [
      'Audit how you appear in search, maps, and AI-generated answers today',
      'Fix NAP gaps, thin pages, and missing structured data',
      'Keep name, category, and contact details consistent everywhere you publish',
    ],
    seoTitle: 'Local SEO & AI search visibility for Australian businesses | Unite Group',
    seoDescription:
      'Be found in Google and AI assistants: audits, consistent business facts, and search fixes for Australian and New Zealand SMBs. Visibility layer — coming.',
    searchIntent: 'local SEO services Australia / show up in ChatGPT business recommendations',
    audience: 'Owners who get referrals but vanish online, or see the wrong phone number in search.',
    problems: [
      'Competitors rank for your suburb while your site barely loads on mobile',
      'Google Business Profile and your website disagree on hours or phone',
      'AI assistants summarise you from outdated directories',
    ],
    outcomes: [
      'One checked profile of how you appear today',
      'A prioritised fix list — not a 40-tab dashboard',
      'Copy and data you can reuse on site, cards, and listings',
    ],
    faq: [
      {
        q: 'Is this a monthly SEO retainer?',
        a: 'The Visibility layer is still on the roadmap. When it ships, it will be priced plainly — we will publish it on the pricing page, not hide it in a proposal.',
      },
      {
        q: 'Do you guarantee page-one rankings?',
        a: 'No. We fix accuracy, speed, and clarity so search engines and assistants can trust your facts — we do not sell guaranteed positions.',
      },
      {
        q: 'Can I start before Visibility is live?',
        a: 'Yes. A living business card and a fast public page are live today under Conversion and Experience — they are the first places many people find you.',
      },
    ],
  },
  {
    slug: 'experience',
    name: 'Experience',
    line: 'Give people something worth opening.',
    headline: 'Make the first look worth remembering.',
    intro:
      'Experience is the first three seconds: film, type, and layout that feel like your business on the phone someone already has in their hand.',
    will: [
      'Short films and pages that feel like your business — not a generic template',
      'Built mobile-first with real media budgets, not decorative placeholders',
      'Fast to load, easy to read, accessible contrast and tap targets',
    ],
    seoTitle: 'Premium mobile web experience & video business cards | Unite Group',
    seoDescription:
      'Phone-first pages and living business cards that load fast and end on your brand. Built for Australian SMBs. Card showroom live; wider Experience stack coming.',
    searchIntent: 'video business card / mobile-first small business website design Australia',
    audience: 'Teams embarrassed to text a PDF link or a clip-art card after a good meeting.',
    problems: [
      'Homepage looks fine on desktop but breaks on the device customers actually use',
      'Stock imagery and lorem ipsum undermine trust after a referral',
      'No owned media — everything is borrowed from a template library',
    ],
    outcomes: [
      'A film-led first impression you are willing to share in a text message',
      'Pages that pass basic speed and readability checks on real devices',
      'A visual language you can extend to signatures and showroom tiles',
    ],
    faq: [
      {
        q: 'What can I buy today?',
        a: 'Living business cards in the showroom are live — nine opening films, your logo on the last frame, QR and vCard built in.',
      },
      {
        q: 'Do you build full marketing sites here?',
        a: 'Broader Experience tooling is coming. For multi-page sites today, see pricing, Grow packages, or ask us on the contact form.',
      },
      {
        q: 'Are the sample films AI-generated?',
        a: 'Showroom editions are labelled AI-generated. Your delivered card uses your logo and details — we send a private proof before anything is public.',
      },
    ],
  },
  {
    slug: 'conversion',
    name: 'Conversion',
    line: 'Turn interest into an enquiry or an order.',
    headline: 'Turn a look into an enquiry.',
    intro:
      'Conversion is one obvious next step on every surface — order a card, book a call, or send a form — and one inbox that does not lose the thread.',
    will: [
      'One primary action per page, written for humans not algorithms only',
      'Forms and CTAs that land in one monitored inbox with context',
      'Follow-up paths that do not depend on someone remembering a sticky note',
    ],
    seoTitle: 'Conversion: living business cards & clear enquire paths | Unite Group',
    seoDescription:
      'Turn attention into enquiries with living business cards, order flows, and one inbox. Video cards from $249 GST included — live for Australian businesses.',
    searchIntent: 'living business card order / digital business card with video Australia',
    audience: 'Owners who get views on social or referrals but no structured way to capture the next step.',
    problems: [
      'Interested people bounce because the next click is unclear',
      'Enquiries arrive in DMs, email, and voicemail with no single record',
      'Paid campaigns send traffic to pages that do not match the ad promise',
    ],
    outcomes: [
      'A card or page with a single primary CTA you can measure',
      'Hosted card link with QR, vCard save, and clear contact paths',
      'Honest pricing on the site — GST called out, proof before go-live',
    ],
    faq: [
      {
        q: 'What is live right now?',
        a: 'Living business cards: showroom, order flow, tiers when Stripe links are configured, and hosting terms published.',
      },
      {
        q: 'How long from order to live card?',
        a: 'You pick an edition, send logo and details, approve a private proof, then we publish. Timing depends on revision rounds — ask us if you are on a deadline.',
      },
      {
        q: 'Is there a monthly fee for the card?',
        a: 'The card is a one-off price, GST included, with 12 months hosting. Renewal is optional and spelled out in card terms.',
      },
    ],
  },
  {
    slug: 'intelligence',
    name: 'Intelligence',
    line: 'See what is working, and what to fix next.',
    headline: 'See what is working.',
    intro:
      'Intelligence is a short read on where enquiries came from and what to fix next — built for owners, not analysts babysitting charts.',
    will: [
      'A periodic summary of top pages, referrers, and enquiry sources',
      'What to fix next, in priority order, tied to revenue paths not vanity metrics',
      'No dashboard certification required to understand the takeaway',
    ],
    seoTitle: 'Simple marketing intelligence & enquiry reporting | Unite Group',
    seoDescription:
      'Plain-language summaries of enquiries, pages, and next fixes for Australian SMBs — without another BI login. Intelligence layer coming.',
    searchIntent: 'simple marketing analytics for small business / where do my leads come from',
    audience: 'Founders who export CSVs once a quarter and still cannot explain what changed.',
    problems: [
      'Analytics tools show graphs but not decisions',
      'CRM is empty because nobody maintained it after setup',
      'No link between site changes and enquiry volume',
    ],
    outcomes: [
      'A written summary you can forward to a contractor or partner',
      'Tags and sources aligned with how you actually sell',
      'Clear “fix this next” items instead of 50 open tabs',
    ],
    faq: [
      {
        q: 'Is this the same as your founder CRM?',
        a: 'The public Intelligence layer is a simpler read for customers. Internal CRM tools stay private to the founder workspace.',
      },
      {
        q: 'Will Intelligence include AI recommendations?',
        a: 'When it ships, recommendations will cite your real enquiry and page data — not generic tips.',
      },
      {
        q: 'Can I get a report today?',
        a: 'Ask via the contact form. While Intelligence is coming, we can still talk through what you see in your existing tools.',
      },
    ],
  },
]

export const pillarPath = (slug: Pillar['slug']): `/solutions/${Pillar['slug']}` => `/solutions/${slug}`

/** The only product on sale. It sits in the Conversion layer (spec s10). */
export const SHIPPED_PILLAR: Pillar['slug'] = 'conversion'

/** The lowest card price a buyer can pay right now, formatted, or null while online ordering is off (cardFromAud). */
export const lowestCardPrice = (): string | null => {
  const from = cardFromAud()
  return from === null ? null : formatAud(from)
}

export const PRICE_NOTE = 'One-off price, GST included'

/** Every public route, in sitemap order. */
export const PUBLIC_ROUTES = [
  '/',
  '/cards',
  '/cards/order',
  '/cards/terms',
  '/video/ten-clips',
  '/get-a-website',
  '/bots',
  '/pricing',
  '/signatures',
  ...PILLARS.map((p) => pillarPath(p.slug)),
  '/privacy-policy',
  '/terms-of-service',
] as const

export type PublicRoute = (typeof PUBLIC_ROUTES)[number]
