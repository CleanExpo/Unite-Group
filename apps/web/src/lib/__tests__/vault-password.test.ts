// @vitest-environment jsdom
// src/lib/__tests__/vault-password.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

import {
  isVaultPasswordSet,
  getStoredHash,
  verifyVaultPassword,
  changeVaultPassword,
  resetVaultPassword,
} from '../vault-password'

describe('vault-password (UI access gate)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('isVaultPasswordSet', () => {
    it('is false before any password is set', () => {
      expect(isVaultPasswordSet()).toBe(false)
    })

    it('is true once a password is set', async () => {
      await resetVaultPassword('hunter2')
      expect(isVaultPasswordSet()).toBe(true)
    })
  })

  describe('verifyVaultPassword', () => {
    it('always returns false when no password has been set', async () => {
      expect(await verifyVaultPassword('anything')).toBe(false)
    })

    it('returns true for the correct password and false for a wrong one', async () => {
      await resetVaultPassword('correct horse')
      expect(await verifyVaultPassword('correct horse')).toBe(true)
      expect(await verifyVaultPassword('wrong horse')).toBe(false)
    })

    it('is case- and whitespace-sensitive', async () => {
      await resetVaultPassword('Secret')
      expect(await verifyVaultPassword('secret')).toBe(false)
      expect(await verifyVaultPassword('Secret ')).toBe(false)
    })
  })

  describe('resetVaultPassword', () => {
    it('sets a password without needing the current one (and stores a hash, not plaintext)', async () => {
      await resetVaultPassword('brand-new')
      const hash = await getStoredHash()
      expect(hash).not.toBeNull()
      expect(hash).not.toBe('brand-new') // hashed, never plaintext
      expect(await verifyVaultPassword('brand-new')).toBe(true)
    })

    it('overwrites an existing password', async () => {
      await resetVaultPassword('first')
      await resetVaultPassword('second')
      expect(await verifyVaultPassword('first')).toBe(false)
      expect(await verifyVaultPassword('second')).toBe(true)
    })
  })

  describe('changeVaultPassword', () => {
    it('rejects the change when the current password is wrong', async () => {
      await resetVaultPassword('old-pw')
      const ok = await changeVaultPassword('not-the-old-pw', 'new-pw')
      expect(ok).toBe(false)
      // unchanged — old still verifies, new does not
      expect(await verifyVaultPassword('old-pw')).toBe(true)
      expect(await verifyVaultPassword('new-pw')).toBe(false)
    })

    it('changes the password when the current one is correct', async () => {
      await resetVaultPassword('old-pw')
      const ok = await changeVaultPassword('old-pw', 'new-pw')
      expect(ok).toBe(true)
      expect(await verifyVaultPassword('old-pw')).toBe(false)
      expect(await verifyVaultPassword('new-pw')).toBe(true)
    })

    it('returns false when no password is set yet (nothing to verify against)', async () => {
      expect(await changeVaultPassword('whatever', 'new-pw')).toBe(false)
      expect(isVaultPasswordSet()).toBe(false)
    })
  })
})
