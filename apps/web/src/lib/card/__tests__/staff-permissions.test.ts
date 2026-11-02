import { describe, expect, it } from 'vitest'

import {
  BUSINESS_FIELDS,
  CARD_STATES,
  canEditField,
  canManageStaffCard,
  ROLES,
  roleFor,
  STAFF_FIELDS,
  type CardField,
} from '../staff-permissions'

/** The founder's rule written out cell by cell, independently of the code under test. */
const ALLOWED = new Set<string>([
  ...BUSINESS_FIELDS.flatMap((f) => CARD_STATES.map((s) => `owner|${f}|${s}`)),
  ...STAFF_FIELDS.map((f) => `own_staff|${f}|active`),
])

const FIELDS: CardField[] = [...BUSINESS_FIELDS, ...STAFF_FIELDS]

describe('canEditField: the full grid', () => {
  it('covers every field the founder named', () => {
    expect(BUSINESS_FIELDS).toEqual(['business_name', 'logo_url', 'phone', 'email', 'website', 'address', 'offer'])
    expect(STAFF_FIELDS).toEqual(['staff_name', 'photo_url', 'mobile'])
    expect(ROLES).toEqual(['owner', 'own_staff', 'other_staff', 'other_owner', 'anonymous'])
  })

  it('has exactly 100 cells: 5 roles x 10 fields x 2 states', () => {
    expect(ROLES.length * FIELDS.length * CARD_STATES.length).toBe(100)
  })

  for (const role of ROLES) {
    for (const field of FIELDS) {
      for (const state of CARD_STATES) {
        const allowed = ALLOWED.has(`${role}|${field}|${state}`)
        it(`${role} ${allowed ? 'may' : 'may not'} change ${field} on a ${state} card`, () => {
          expect(canEditField(role, field, state)).toBe(allowed)
        })
      }
    }
  }
})

describe('canManageStaffCard', () => {
  it('allows only the owner, only while the card is active', () => {
    for (const role of ROLES) {
      for (const state of CARD_STATES) {
        expect(canManageStaffCard(role, state), `${role} ${state}`).toBe(role === 'owner' && state === 'active')
      }
    }
  })
})

describe('roleFor', () => {
  const owner = { kind: 'owner', accountId: 'acct-1', founderId: 'f' } as const
  const staff = { kind: 'staff', staffId: 'card-1', accountId: 'acct-1', founderId: 'f' } as const

  it('reads no link as anonymous', () => {
    expect(roleFor(null, { accountId: 'acct-1' })).toBe('anonymous')
  })
  it('separates the owner of this account from the owner of another', () => {
    expect(roleFor(owner, { accountId: 'acct-1', staffId: 'card-1' })).toBe('owner')
    expect(roleFor(owner, { accountId: 'acct-2', staffId: 'card-9' })).toBe('other_owner')
  })
  it('makes a staff member own_staff only on their own card, even within the same account', () => {
    expect(roleFor(staff, { accountId: 'acct-1', staffId: 'card-1' })).toBe('own_staff')
    expect(roleFor(staff, { accountId: 'acct-1', staffId: 'card-2' })).toBe('other_staff')
  })
  it('never treats a staff member as the owner of the account itself', () => {
    expect(roleFor(staff, { accountId: 'acct-1' })).toBe('other_staff')
  })
})
