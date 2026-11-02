import { createHash, randomInt } from 'node:crypto'

// Invite codes (UNI-3167). A code is 24 characters from a 30-character alphabet with no look-alikes
// (no 0/O, 1/I/L, U), about 117 bits of randomness, shown in six groups of four for reading aloud.
// Only the SHA-256 hash is ever stored. The plaintext is returned once, to the founder who made it.

export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
export const INVITE_CODE_LENGTH = 24
const HASH_DOMAIN = 'unite-group:portal-invite:v1:'

/** A new random code, formatted XXXX-XXXX-XXXX-XXXX-XXXX-XXXX. Uses crypto.randomInt (uniform, no modulo bias). */
export function generateInviteCode(random: (max: number) => number = randomInt): string {
  let raw = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) raw += INVITE_ALPHABET[random(INVITE_ALPHABET.length)]
  return formatInviteCode(raw)
}

export function formatInviteCode(normalised: string): string {
  return normalised.match(/.{1,4}/g)?.join('-') ?? normalised
}

/** Upper-cases and strips spaces and dashes. Returns null unless the result is a well-formed code. */
export function normaliseInviteCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 64) return null
  const s = input.toUpperCase().replace(/[\s-]/g, '')
  if (s.length !== INVITE_CODE_LENGTH) return null
  for (const ch of s) if (!INVITE_ALPHABET.includes(ch)) return null
  return s
}

/** Hex SHA-256 of a normalised code, with a fixed domain prefix. This is what the database stores and compares. */
export function hashInviteCode(normalised: string): string {
  return createHash('sha256').update(HASH_DOMAIN + normalised).digest('hex')
}

/** Last four characters, so the founder can tell codes apart in the list. Not enough to guess the code. */
export function inviteCodeHint(normalised: string): string {
  return normalised.slice(-4)
}
