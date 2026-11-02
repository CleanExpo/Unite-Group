import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  formatInviteCode, generateInviteCode, hashInviteCode, INVITE_ALPHABET, INVITE_CODE_LENGTH, inviteCodeHint, normaliseInviteCode,
} from '../code'
import { BRII_EXAMPLE_CODE } from '../__fixtures__/brii'

describe('invite codes', () => {
  it('makes 24 characters from the 30-character alphabet, in six groups of four', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){5}$/)
    const raw = code.replace(/-/g, '')
    expect(raw).toHaveLength(INVITE_CODE_LENGTH)
    for (const ch of raw) expect(INVITE_ALPHABET).toContain(ch)
    expect(INVITE_ALPHABET).toHaveLength(30)
    expect(INVITE_ALPHABET).not.toMatch(/[01ILOU]/)
  })

  it('uses every random draw (no fixed characters)', () => {
    let i = 0
    const code = generateInviteCode(() => (i++ % 30))
    expect(code.replace(/-/g, '')).toBe((INVITE_ALPHABET + INVITE_ALPHABET).slice(0, 24))
  })

  it('two codes are different', () => {
    expect(generateInviteCode()).not.toBe(generateInviteCode())
  })

  it('normalises case, spaces and dashes, and refuses anything malformed', () => {
    const plain = BRII_EXAMPLE_CODE.replace(/-/g, '')
    expect(normaliseInviteCode(BRII_EXAMPLE_CODE.toLowerCase())).toBe(plain)
    expect(normaliseInviteCode(` ${plain.match(/.{4}/g)!.join(' ')} `)).toBe(plain)
    expect(normaliseInviteCode(plain.slice(1))).toBeNull()
    expect(normaliseInviteCode(plain.slice(0, 23) + '0')).toBeNull() // 0 is not in the alphabet
    expect(normaliseInviteCode('A'.repeat(65))).toBeNull()
    expect(normaliseInviteCode(42)).toBeNull()
    expect(formatInviteCode(plain)).toBe(BRII_EXAMPLE_CODE)
  })

  it('stores a 64-hex hash that never contains the code, and the same code always hashes the same', () => {
    const plain = normaliseInviteCode(BRII_EXAMPLE_CODE)!
    const hash = hashInviteCode(plain)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash.toUpperCase()).not.toContain(plain)
    expect(hashInviteCode(plain)).toBe(hash)
    expect(hashInviteCode(plain.slice(0, 23) + 'A')).not.toBe(hash)
    // domain-separated: not the bare SHA-256 of the code
    expect(hash).not.toBe(createHash('sha256').update(plain).digest('hex'))
  })

  it('the hint is the last four characters only', () => {
    expect(inviteCodeHint(normaliseInviteCode(BRII_EXAMPLE_CODE)!)).toBe('JKMN')
  })
})
