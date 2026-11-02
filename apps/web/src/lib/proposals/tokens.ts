// Proposal link tokens and comp codes (UNI-3173). Only their SHA-256 hashes are stored, so a database read cannot
// recover a working link or code. Both carry enough randomness that guessing is not a practical attack.

import { createHash, randomBytes } from 'node:crypto'

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/
// Crockford base32: no I, L, O or U, so a code read aloud or retyped cannot be misread.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LENGTH = 16

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function newProposalToken(): string {
  return randomBytes(32).toString('base64url')
}

export function isProposalToken(value: string): boolean {
  return TOKEN_SHAPE.test(value)
}

/** A code like 7K2M-9QXR-4TVH-1BNP: 80 bits of randomness. Every byte is masked to 5 bits, so there is no bias. */
export function newCompCode(): string {
  const chars = Array.from(randomBytes(CODE_LENGTH), (byte) => CODE_ALPHABET[byte & 31])
  return chars.join('').replace(/(.{4})(?=.)/g, '$1-')
}

/** Upper case without separators, so a code still matches however the person typed it. */
export function normaliseCompCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '')
}

export function hashCompCode(raw: string): string {
  return sha256Hex(normaliseCompCode(raw))
}
