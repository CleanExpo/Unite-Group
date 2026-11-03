// The Unite Group demo bots shown on /bots (UNI-3214, UNI-3215). Copy and settings in one place.
//
// Rules for this file:
// - No prices. None are approved for bots, so no card, schema entry or reply may carry one.
// - Only what is live is called live. Lead follow-up is the one bot a visitor can try in this release;
//   every other card says "Demo coming soon".
// - Every picture is a real file listed in media.manifest.json, the one home for its alt text, source and
//   credit (premium-visuals standard). A video slot with a null src renders nothing, never a drawn stand-in.

import type { MediaEntry, MediaManifest } from '@cleanexpo/premium-visuals/manifest'

import manifestJson from '../../../../../media.manifest.json'

export type BotStatus = 'live' | 'coming-soon'

/** A named picture slot holding a media manifest entry. */
export type BotMediaSlot = { name: string; media: MediaEntry }

/** An explainer video. A null src renders nothing and emits no VideoObject. */
export type BotVideoSlot = {
  name: string
  src: string | null
  poster: string | null
  title: string
  description: string
  uploadDate: string | null
  duration: string | null
}

export type Bot = {
  id: string
  name: string
  summary: string
  points: readonly [string, string, string]
  status: BotStatus
  image: BotMediaSlot
  video: BotVideoSlot
}

export const BOTS_PAGE_PATH = '/bots'

/** The lead follow-up card's live demo sits in this section of /bots. */
export const LEAD_DEMO_ANCHOR = 'try-lead-follow-up'

const MANIFEST = manifestJson as unknown as MediaManifest

/** The manifest entry for a public file. A missing entry fails the build, so no unlisted picture can ship. */
export function manifestMedia(src: string): MediaEntry {
  const entry = MANIFEST.entries.find((e) => e.src === src)
  if (!entry) throw new Error(`media.manifest.json has no entry for ${src}`)
  return entry
}

const picture = (id: string): BotMediaSlot => ({ name: `bots-${id}`, media: manifestMedia(`/bots/visuals/${id}-1600.webp`) })

/** The /bots hero photo (Higgsfield generated, Australian small-business setting). */
export const BOTS_HERO: MediaEntry = manifestMedia('/bots/visuals/hero-1600.webp')

const noVideo = (name: string, title: string): BotVideoSlot => ({
  name,
  src: null,
  poster: null,
  title,
  description: '',
  uploadDate: null,
  duration: null,
})

export const BOTS: readonly Bot[] = [
  {
    id: 'lead-follow-up',
    name: 'Lead follow-up',
    summary: 'Replies to a new enquiry straight away, asks the right questions and passes you a ready-to-call lead.',
    points: [
      'Answers a new enquiry in seconds, day or night',
      'Asks what the customer needs and how to reach them',
      'Puts the lead in your inbox with their name, email, phone and need',
    ],
    status: 'live',
    image: picture('lead-follow-up'),
    video: noVideo('bots-lead-follow-up-explainer', 'Lead follow-up bot explainer'),
  },
  {
    id: 'front-desk-voice',
    name: 'Front desk voice',
    summary: 'Picks up the phone when you cannot, answers common questions and takes a message.',
    points: [
      'Answers calls in a natural voice when you are busy',
      'Handles common questions such as opening hours and location',
      'Sends you a short written summary of every call',
    ],
    status: 'coming-soon',
    image: picture('front-desk-voice'),
    video: noVideo('bots-front-desk-voice-explainer', 'Front desk voice bot explainer'),
  },
  {
    id: 'bookings',
    name: 'Bookings',
    summary: 'Finds a time that suits the customer and books it in, without the back-and-forth.',
    points: [
      'Offers open times and books the one the customer picks',
      'Sends a confirmation and a reminder before the visit',
      'Moves or cancels a booking when the customer asks',
    ],
    status: 'coming-soon',
    image: picture('bookings'),
    video: noVideo('bots-bookings-explainer', 'Bookings bot explainer'),
  },
  {
    id: 'product-order',
    name: 'Product and order',
    summary: 'Answers product questions and order checks so customers get a reply without waiting.',
    points: [
      'Answers questions about your products from your own details',
      'Tells customers where their order is up to',
      'Hands anything unusual to you with the full conversation',
    ],
    status: 'coming-soon',
    image: picture('product-order'),
    video: noVideo('bots-product-order-explainer', 'Product and order bot explainer'),
  },
  {
    id: 'reviews',
    name: 'Reviews',
    summary: 'Asks happy customers for a review at the right moment and drafts replies for you to approve.',
    points: [
      'Asks for a review after a good visit or delivery',
      'Drafts a reply to each new review for you to check',
      'Flags an unhappy customer to you quickly',
    ],
    status: 'coming-soon',
    image: picture('reviews'),
    video: noVideo('bots-reviews-explainer', 'Reviews bot explainer'),
  },
]

export const liveBots = (): Bot[] => BOTS.filter((b) => b.status === 'live')
