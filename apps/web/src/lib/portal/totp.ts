import { createHmac } from 'node:crypto'

// RFC 6238 TOTP: SHA1, 30 second step, 6 digits. This is the check Supabase Auth
// runs in verifyTOTPFactor (period 30, skew 1, digits 6, SHA1). The secret Supabase
// returns from enroll is base32.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_MS = 30_000

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[^A-Za-z2-7]/g, '').toUpperCase()
  if (clean.length === 0) throw new Error('empty totp secret')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = ALPHABET.indexOf(char)
    if (index < 0) throw new Error('bad totp secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 0xff)
    }
  }
  return Buffer.from(bytes)
}

/** Six-digit code for the window that contains unixMs. */
export function totpCode(secret: string, unixMs: number): string {
  const key = base32Decode(secret)
  const counter = Math.floor(unixMs / STEP_MS)
  const message = Buffer.alloc(8)
  const high = Math.floor(counter / 0x100000000)
  const low = counter >>> 0
  message.writeUInt32BE(high, 0)
  message.writeUInt32BE(low, 4)
  const hmac = createHmac('sha1', key).update(message).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

/** Current window, then the previous and next ones. Supabase accepts skew of one step. */
export function totpAttemptTimes(now: number): number[] {
  return [now, now - STEP_MS, now + STEP_MS]
}
