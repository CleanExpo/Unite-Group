// The Living Business Card offers shown on /grow. They reuse the card order page's own Stripe
// Payment Link env vars, so one value in Vercel drives both pages. Prices are AUD, one-off, GST included.
import { CARD_EXTRA_BUSINESS, CARD_TIERS } from '../cards/order/order-view'
import { stripePaymentLink } from './packages'

export type GrowCardOffer = {
  id: 'ready' | 'custom' | 'extra_business' | 'nfc_tap'
  name: string
  priceAud: number
  line: string
  /** Server-only env var holding the Stripe Payment Link; the offer is hidden while it is unset or invalid. */
  paymentLinkEnv: string
  /** Resting frame of a real card film, from public/cards/media. */
  poster: string
  posterAlt: string
  benefits: readonly string[]
  recommended?: boolean
}

/** New for the NFC tap card. No Stripe link exists for it yet, so the slot stays hidden until Phill sets one. */
export const NFC_TAP_CARD_ENV = 'STRIPE_PAYMENT_LINK_CARD_NFC_TAP'

const ready = CARD_TIERS[0]
const custom = CARD_TIERS[1]

const media = (file: string) => `/cards/media/${file}`

export const GROW_CARD_OFFERS: readonly GrowCardOffer[] = [
  {
    id: 'ready',
    name: ready.name,
    priceAud: ready.priceAud,
    line: 'Choose one of ten finished card films. It ends on your logo and details.',
    paymentLinkEnv: ready.paymentLinkEnv,
    poster: media('edition-blueprint-poster.jpg'),
    posterAlt: 'Still from the Blueprint card film',
    benefits: ['Ten films to choose from', 'Your logo and details at the end', 'Private preview before it goes live'],
  },
  {
    id: 'custom',
    name: custom.name,
    priceAud: custom.priceAud,
    line: 'A film made for your business, from your logo and brand colours.',
    paymentLinkEnv: custom.paymentLinkEnv,
    poster: media('unite-nexus-u-reveal-poster-9x16.jpg'),
    posterAlt: 'Still from the Signature card film',
    benefits: ['Made only for your business', 'A private proof to approve first', 'Can include extra businesses'],
    recommended: true,
  },
  {
    id: 'extra_business',
    name: CARD_EXTRA_BUSINESS.name,
    priceAud: CARD_EXTRA_BUSINESS.priceAud,
    line: `Add another business to a Made for you card, up to ${CARD_EXTRA_BUSINESS.maxQuantity}.`,
    paymentLinkEnv: CARD_EXTRA_BUSINESS.paymentLinkEnv,
    poster: media('edition-constellation-poster.jpg'),
    posterAlt: 'Still from the Constellation card film',
    benefits: ['One card for several businesses', 'Each business gets its own details', 'Priced per business'],
  },
  {
    id: 'nfc_tap',
    name: 'NFC tap card',
    priceAud: 0,
    line: 'A physical card. Tap it on a phone to open your Living Business Card.',
    paymentLinkEnv: NFC_TAP_CARD_ENV,
    poster: media('edition-forge-poster.jpg'),
    posterAlt: 'Still from the Forge card film',
    benefits: ['Works with most phones', 'No app needed'],
  },
]
/** Offers whose Payment Link is set, each with its link. The NFC price is shown by Stripe checkout, not here. */
export function liveCardOffers(env: Record<string, string | undefined> = process.env) {
  return GROW_CARD_OFFERS.flatMap((o) => {
    const link = stripePaymentLink(env[o.paymentLinkEnv])
    return link ? [{ ...o, link }] : []
  })
}
