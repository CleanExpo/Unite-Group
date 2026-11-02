// The "Get a new website" funnel: copy and settings in one place, for any business that asks.

export const OFFER_ID = 'website-intake'
export const INTAKE_SOURCE = 'website_intake'
export const PAGE_PATH = '/get-a-website'
export const THANKS_PATH = '/get-a-website/thanks'

/** The live booking page. While this is null, the thank-you page offers the call by email instead. */
export const BOOKING_URL: string | null = null

/**
 * A picture for this page. A null src renders nothing: the page never shows a placeholder or a drawn stand-in.
 * Add the file to public/get-a-website and set src, width and height to switch it on.
 */
export type ImageSlot = { name: string; src: string | null; width: number; height: number; alt: string }

export const HERO_IMAGE: ImageSlot = {
  name: 'website-intake-hero',
  src: null,
  width: 1600,
  height: 1200,
  alt: 'A small business owner at their shop counter, looking at their new website on a tablet',
}

export const THANKS_IMAGE: ImageSlot = {
  name: 'website-intake-thanks',
  src: null,
  width: 1600,
  height: 900,
  alt: 'A small business owner on a phone call at a sunlit desk, with notes beside a laptop',
}

export const STEPS = [
  { title: 'Tell us about your business', body: 'Answer the questions below. Most of them take a line or two.' },
  { title: 'We read your answers', body: 'We look at your business and your current website, if you have one.' },
  { title: 'We talk it through', body: 'Book a call or reply to our email. You get a clear plan and a quote before anything starts.' },
] as const

export const PHOTO_OPTIONS = [
  'Yes, I have my own photos',
  'I have a few and need more',
  'No, I need help with photos',
] as const

export const BUDGET_BANDS = [
  'Under A$2,000',
  'A$2,000 to A$5,000',
  'A$5,000 to A$10,000',
  'Over A$10,000',
  'Not sure yet',
] as const

export const CALL_TIMES = [
  'Yes, in the morning',
  'Yes, in the afternoon',
  'Yes, after 5 pm',
  'No call for now, email me',
] as const

export const TIMELINES = [
  'As soon as possible',
  'Within 1 to 3 months',
  'In 3 months or more',
  'Not sure yet',
] as const
