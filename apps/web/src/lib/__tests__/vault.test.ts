// src/lib/__tests__/vault.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { encrypt, decrypt, type VaultPayload } from '../vault'

// A deterministic 32-byte (64 hex char) key for the test process.
const TEST_KEY = 'a'.repeat(64)

describe('vault AES-256-GCM credential encryption', () => {
  beforeEach(() => {
    vi.stubEnv('VAULT_ENCRYPTION_KEY', TEST_KEY)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips plaintext through encrypt → decrypt', () => {
    const secret = 'xero-client-secret-12345'
    expect(decrypt(encrypt(secret))).toBe(secret)
  })

  it('round-trips empty and unicode strings', () => {
    expect(decrypt(encrypt(''))).toBe('')
    expect(decrypt(encrypt('café ☕ — naïve 日本語'))).toBe('café ☕ — naïve 日本語')
  })

  it('produces a fresh salt and iv per call (no deterministic ciphertext reuse)', () => {
    const a = encrypt('same plaintext')
    const b = encrypt('same plaintext')
    expect(a.encryptedValue).not.toBe(b.encryptedValue)
    expect(a.iv).not.toBe(b.iv)
    expect(a.salt).not.toBe(b.salt)
    // both still decrypt correctly
    expect(decrypt(a)).toBe('same plaintext')
    expect(decrypt(b)).toBe('same plaintext')
  })

  it('emits base64 payload fields of the expected byte lengths', () => {
    const p = encrypt('x')
    expect(Buffer.from(p.iv, 'base64')).toHaveLength(12) // GCM nonce
    expect(Buffer.from(p.salt, 'base64')).toHaveLength(16) // PBKDF2 salt
    // tag(16) || ciphertext(>=1)
    expect(Buffer.from(p.encryptedValue, 'base64').length).toBeGreaterThanOrEqual(17)
  })

  it('rejects a tampered ciphertext (GCM auth tag fails)', () => {
    const p = encrypt('do-not-tamper')
    const bytes = Buffer.from(p.encryptedValue, 'base64')
    bytes[bytes.length - 1] ^= 0xff // flip last ciphertext byte
    const tampered: VaultPayload = { ...p, encryptedValue: bytes.toString('base64') }
    expect(() => decrypt(tampered)).toThrow()
  })

  it('rejects a tampered auth tag', () => {
    const p = encrypt('do-not-tamper')
    const bytes = Buffer.from(p.encryptedValue, 'base64')
    bytes[0] ^= 0xff // flip first tag byte
    const tampered: VaultPayload = { ...p, encryptedValue: bytes.toString('base64') }
    expect(() => decrypt(tampered)).toThrow()
  })

  it('cannot be decrypted with a different VAULT_ENCRYPTION_KEY', () => {
    const p = encrypt('founder-secret')
    vi.stubEnv('VAULT_ENCRYPTION_KEY', 'b'.repeat(64))
    expect(() => decrypt(p)).toThrow()
  })

  it('throws when VAULT_ENCRYPTION_KEY is not set', () => {
    vi.stubEnv('VAULT_ENCRYPTION_KEY', '')
    expect(() => encrypt('anything')).toThrow(/VAULT_ENCRYPTION_KEY/)
  })
})
