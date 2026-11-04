import { describe, expect, it } from 'vitest'

import type { PortalOwner } from '@/lib/portal/changes/types'

import { boardDocumentFor, decideBoardAccess, withScriptNonce } from '../documents'
import { IAQ_BOARD_INVITEES } from '../invitees'

const OWNER: PortalOwner = { userId: 'b1', ownerId: 'b1', tenantSlug: 'iaq-magazine', plan: 'comp', aal: 'aal2' }

describe('decideBoardAccess', () => {
  it('signed out -> sign in', () => {
    expect(decideBoardAccess(false, null)).toEqual({ kind: 'sign_in' })
  })
  it('signed in, no portal -> not found', () => {
    expect(decideBoardAccess(true, null)).toEqual({ kind: 'not_found' })
  })
  it('another tenant on aal2 -> not found, even with a paid plan', () => {
    expect(decideBoardAccess(true, { ...OWNER, tenantSlug: 'brii', plan: 'paid' })).toEqual({ kind: 'not_found' })
  })
  it('a tenant slug that only looks like IAQ -> not found', () => {
    expect(decideBoardAccess(true, { ...OWNER, tenantSlug: 'iaq-magazine-x' })).toEqual({ kind: 'not_found' })
  })
  it('IAQ member on aal1 -> verify', () => {
    expect(decideBoardAccess(true, { ...OWNER, aal: 'aal1' })).toEqual({ kind: 'verify_second_factor' })
  })
  it('another tenant on aal1 -> not found (never hints that the IAQ page exists)', () => {
    expect(decideBoardAccess(true, { ...OWNER, tenantSlug: 'brii', aal: 'aal1' })).toEqual({ kind: 'not_found' })
  })
  it('IAQ member on aal2 -> ok with the IAQ document', () => {
    const d = decideBoardAccess(true, OWNER)
    expect(d.kind).toBe('ok')
    if (d.kind === 'ok') expect(d.document.file).toBe('data/portal/iaq-magazine/board-concept.html')
  })
})

describe('boardDocumentFor', () => {
  it('knows only iaq-magazine', () => {
    expect(boardDocumentFor('iaq-magazine')?.title).toBe('IAQ Magazine knowledge hub concept')
    expect(boardDocumentFor('brii')).toBeNull()
    expect(boardDocumentFor('constructor')).toBeNull()
    expect(boardDocumentFor('__proto__')).toBeNull()
  })
})

describe('withScriptNonce', () => {
  it('adds the nonce to plain script tags only', () => {
    const html = '<script type="application/ld+json">{}</script><script>run()</script>'
    expect(withScriptNonce(html, 'YWJjZGVmZ2hpamts')).toBe('<script type="application/ld+json">{}</script><script nonce="YWJjZGVmZ2hpamts">run()</script>')
  })
  it('leaves the page alone when there is no usable nonce', () => {
    expect(withScriptNonce('<script>x</script>', null)).toBe('<script>x</script>')
    expect(withScriptNonce('<script>x</script>', '"><img onerror=1>')).toBe('<script>x</script>')
  })
})

describe('IAQ board invitees', () => {
  it('lists the five current board members, in order, with no email yet', () => {
    expect(IAQ_BOARD_INVITEES.map((i) => i.name)).toEqual([
      'Shelby Berg',
      'Ivi Simms',
      'Phill McGurk',
      'Muthukumar Maragathamayil',
      'Philipp Schluter',
    ])
    expect(IAQ_BOARD_INVITEES.every((i) => i.email === null)).toBe(true)
    expect(IAQ_BOARD_INVITEES.every((i) => i.tenantSlug === 'iaq-magazine')).toBe(true)
  })
  it('never includes Melissa Marot', () => {
    expect(JSON.stringify(IAQ_BOARD_INVITEES)).not.toMatch(/melissa|marot/i)
  })
})
