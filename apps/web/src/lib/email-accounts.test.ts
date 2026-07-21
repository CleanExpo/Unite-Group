import { describe, it, expect } from 'vitest'
import { accountByEmail } from './email-accounts'

describe('accountByEmail — case-insensitive lookup (UNI-2153 §8)', () => {
  it('resolves the exact lowercase address', () => {
    expect(accountByEmail('phill@connexusm.com')?.businessKey).toBe('ccw')
  })

  it('resolves a mixed-case address a provider might return', () => {
    // A provider echoing back Phill@ConnexusM.Com must still resolve, else the
    // account footer + voice would be silently dropped.
    const acc = accountByEmail('Phill@ConnexusM.Com')
    expect(acc).toBeDefined()
    expect(acc?.email).toBe('phill@connexusm.com')
    expect(acc?.scope).toBe('client')
  })

  it('trims surrounding whitespace before matching', () => {
    expect(accountByEmail('  contact@unite-group.in  ')?.businessKey).toBe('ugn')
  })

  it('returns undefined for an unknown address', () => {
    expect(accountByEmail('nobody@nowhere.test')).toBeUndefined()
  })
})
