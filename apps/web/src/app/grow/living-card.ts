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
}

/** New for the NFC tap card. No Stripe link exists for it yet, so the slot stays hidden until Phill sets one. */
export const NFC_TAP_CARD_ENV = 'STRIPE_PAYMENT_LINK_CARD_NFC_TAP'

const ready = CARD_TIERS[0]
const custom = CARD_TIERS[1]

export const GROW_CARD_OFFERS: readonly GrowCardOffer[] = [
  { id: 'ready', name: ready.name, priceAud: ready.priceAud, line: 'Choose one of ten short card films. It ends on your logo and details.', paymentLinkEnv: ready.paymentLinkEnv },
  { id: 'custom', name: custom.name, priceAud: custom.priceAud, line: 'We make a film for your business. You approve a private proof before it goes live.', paymentLinkEnv: custom.paymentLinkEnv },
  {
    id: 'extra_business',
    name: CARD_EXTRA_BUSINESS.name,
    priceAud: CARD_EXTRA_BUSINESS.priceAud,
    line: `Add another business to a Made for you card. Up to ${CARD_EXTRA_BUSINESS.maxQuantity}, priced each.`,
    paymentLinkEnv: CARD_EXTRA_BUSINESS.paymentLinkEnv,
  },
  { id: 'nfc_tap', name: 'NFC tap card', priceAud: 0, line: 'A physical card. Tap it on a phone to open your Living Business Card.', paymentLinkEnv: NFC_TAP_CARD_ENV },
]

/** Offers whose Payment Link is set, each with its link. The NFC price is shown by Stripe checkout, not here. */
export function liveCardOffers(env: Record<string, string | undefined> = process.env) {
  return GROW_CARD_OFFERS.flatMap((o) => {
    const link = stripePaymentLink(env[o.paymentLinkEnv])
    return link ? [{ ...o, link }] : []
  })
}
