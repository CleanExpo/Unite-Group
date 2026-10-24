// Server-side reader for the Margot AI phone line (UNI-2996).
// Same small reader as src/lib/margot/phone-line.ts on feat/margot-phone-line; the two copies
// merge into one home when the branches land.
// Unset, blank or malformed means "no line yet": nothing renders and nothing is added to the vCard.

export const E164 = /^\+[1-9]\d{7,14}$/

export function readMargotPhoneNumber(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.MARGOT_PHONE_NUMBER?.trim()
  return value && E164.test(value) ? value : null
}
