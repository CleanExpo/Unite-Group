// src/lib/public-pricing.ts
// The one source for the public plan and add-on prices shown on /pricing and /signatures.
// Card prices are read from CARD_TIERS so the card order page and this page can never disagree.
import { CARD_TIERS } from '@/app/cards/order/order-view'

export const STARTER_PLAN = {
  name: 'Starter',
  priceAud: 99,
  period: 'month',
  line: 'Your marketing run by Unite Group, with Margot as the AI face of your business.',
} as const

export const SIGNATURE_ADDON = {
  name: 'Email signatures',
  priceAud: 22,
  unit: 'each',
  line: 'A branded email signature for each person on your team, introduced by Margot.',
  href: '/signatures',
} as const

export const CARD_FROM_AUD = Math.min(...CARD_TIERS.map((t) => t.priceAud))
