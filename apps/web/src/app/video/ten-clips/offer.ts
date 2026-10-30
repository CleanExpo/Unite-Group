/**
 * "Ten clips in a week": the one offer on /video/ten-clips. Copy and price live here so the page,
 * the structured data and the tests read one source.
 *
 * Payment: there is deliberately NO payment link yet. When Phill creates the Stripe Payment Link,
 * it goes in the Vercel env var STRIPE_PAYMENT_LINK_VIDEO_TEN_CLIPS (same pattern as
 * STRIPE_PAYMENT_LINK_CARD_*), and a pay button is added in page.tsx beside the form.
 * See docs/guides/ten-clips-payment-link.md. Until then the form is the only call to action.
 */

export const OFFER_ID = 'ten-clips'
export const PAGE_PATH = '/video/ten-clips'

export const PRICE_AUD = 1490
export const MONTHLY_AUD = 590
export const MONTHLY_CLIPS = 6
export const DELIVERY_DAYS = 7

/** The card film used as the sample. It is one of the existing /cards editions. */
export const SAMPLE_EDITION = 'skyline'
export const SAMPLE_LABEL = 'Sample made for a made-up business'

export const WHAT_YOU_GET = [
  '10 short videos, each 10 to 20 seconds long',
  'Every video in vertical 9:16 for Reels, Shorts and TikTok, and in square 1:1 for feeds and ads',
  'Captions burned in, so they play with the sound off',
  'An Australian voiceover',
  'Your logo and your brand colours on every video',
  'Made from your photos, your logo and a one-page brief',
  'One round of changes',
] as const

export const STEPS = [
  { title: 'Send your materials', body: 'Send your photos, your logo and a one-page brief. The brief says what you sell, who it is for and what you want people to do.' },
  { title: 'We make the ten clips', body: 'We write the lines, record the Australian voiceover, add captions and cut each clip in both shapes.' },
  { title: 'You review them', body: 'You get all ten to look at and tell us what to change, in one round.' },
  { title: 'We deliver the files', body: 'You receive the final files, ready to post and to use in ads.' },
] as const

export const WHAT_WE_NEED = [
  'Your photos of your work, your team or your products',
  'Your logo',
  'A one-page brief: what you sell, who it is for, and what you want people to do',
] as const

export const DELIVERY_PROMISE = `Delivered within ${DELIVERY_DAYS} days of receiving your photos, logo and brief.`
export const PRICE_LINE = 'A$1,490 one-off, GST included.'
export const MONTHLY_LINE = `Want more later? ${MONTHLY_CLIPS} clips a month for A$${MONTHLY_AUD}, GST included.`
export const PRESENTER_LINE = 'An AI presenter can be added to your clips. It is available on request, and we will quote.'
