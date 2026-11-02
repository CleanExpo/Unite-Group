import { describe, expect, it } from 'vitest'

import { isOwnPhotoPath, photoPathFor, validateChangeInput, validateEditNote, validatePhotoFile } from '../validate'

const ID = '11111111-1111-1111-1111-111111111111'

describe('change request input', () => {
  it('accepts a known page and a real request, trimmed', () => {
    expect(validateChangeInput({ page: 'contact', requestText: '  New phone 0400 000 000  ' }, 'alpha'))
      .toEqual({ ok: true, value: { page: 'contact', requestText: 'New phone 0400 000 000', photoPath: null } })
  })

  it('refuses an unknown page, a too-short or too-long request', () => {
    expect(validateChangeInput({ page: 'blog', requestText: 'Change it please' }, 'alpha').ok).toBe(false)
    expect(validateChangeInput({ page: 'home', requestText: 'hi' }, 'alpha').ok).toBe(false)
    expect(validateChangeInput({ page: 'home', requestText: 'x'.repeat(2001) }, 'alpha').ok).toBe(false)
  })

  it('a photo path must sit in her own tenant folder with a uuid name', () => {
    expect(isOwnPhotoPath(`alpha/${ID}.jpg`, 'alpha')).toBe(true)
    expect(isOwnPhotoPath(`beta/${ID}.jpg`, 'alpha')).toBe(false)
    expect(isOwnPhotoPath('alpha/../beta/x.jpg', 'alpha')).toBe(false)
    expect(isOwnPhotoPath(`alpha/${ID}.svg`, 'alpha')).toBe(false)
    expect(validateChangeInput({ page: 'home', requestText: 'Swap the photo', photoPath: `beta/${ID}.png` }, 'alpha').ok).toBe(false)
  })

  it('builds photo paths only for allowed image types', () => {
    expect(photoPathFor('alpha', ID, 'image/webp')).toBe(`alpha/${ID}.webp`)
    expect(photoPathFor('alpha', ID, 'image/svg+xml')).toBeNull()
    expect(photoPathFor('alpha', 'not-a-uuid', 'image/png')).toBeNull()
  })

  it('photo files: type, size and empty checks', () => {
    expect(validatePhotoFile({ size: 1000, type: 'image/jpeg' })).toBeNull()
    expect(validatePhotoFile({ size: 1000, type: 'application/pdf' })).not.toBeNull()
    expect(validatePhotoFile({ size: 5 * 1024 * 1024 + 1, type: 'image/png' })).not.toBeNull()
    expect(validatePhotoFile({ size: 0, type: 'image/png' })).not.toBeNull()
  })

  it('edit notes must say something and stay short', () => {
    expect(validateEditNote('  Use the other photo ')).toEqual({ ok: true, value: 'Use the other photo' })
    expect(validateEditNote('   ').ok).toBe(false)
    expect(validateEditNote('x'.repeat(1001)).ok).toBe(false)
  })
})
