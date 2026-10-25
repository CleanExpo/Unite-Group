// Server-side reader for the Margot AI phone line (UNI-2996).
// Same small reader as src/lib/margot/phone-line.ts on feat/margot-phone-line; the two copies
// merge into one home when the branches land.
// Unset, blank or malformed means "no line yet": nothing renders and nothing is added to the vCard.

export const E164 = /^\+[1-9]\d{7,14}$/

export function readMargotPhoneNumber(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.MARGOT_PHONE_NUMBER?.trim()
  return value && E164.test(value) ? value : null
}

/** The founder's own card: the slug seeded for the card owner in 20261024230000_card_owner_seed_phill.sql. */
export const OWNER_CARD_SLUG = 'phill-mcgurk'

/**
 * The Margot line for one card. Spec v1.4 (lines 1568, 1789): Margot is not on client cards by default,
 * so only the founder's own card ever carries it; every other card gets null.
 */
export function margotPhoneForCard(slug: string, env: Record<string, string | undefined> = process.env): string | null {
  return slug === OWNER_CARD_SLUG ? readMargotPhoneNumber(env) : null
}
