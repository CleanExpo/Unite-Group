import { afterEach, describe, expect, it } from 'vitest'

import { isGoogleClientIdPlaceholder, isGoogleConfigured } from '../google-oauth'

const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID
const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET

afterEach(() => {
  process.env.GOOGLE_CLIENT_ID = originalGoogleClientId
  process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret
})

describe('google oauth configuration', () => {
  it('treats empty and placeholder client ids as placeholders', () => {
    expect(isGoogleClientIdPlaceholder('')).toBe(true)
    expect(isGoogleClientIdPlaceholder('your-production-client-id')).toBe(true)
    expect(isGoogleClientIdPlaceholder('your-google-client-id.apps.googleusercontent.com')).toBe(
      true
    )
    expect(isGoogleClientIdPlaceholder('valid-client.apps.googleusercontent.com')).toBe(false)
  })

  it('requires a non-placeholder client id and secret', () => {
    process.env.GOOGLE_CLIENT_ID = 'your-production-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'real-secret'
    expect(isGoogleConfigured()).toBe(false)

    process.env.GOOGLE_CLIENT_ID = 'valid-client.apps.googleusercontent.com'
    expect(isGoogleConfigured()).toBe(true)
  })
})
