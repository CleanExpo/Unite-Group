import { describe, expect, it } from 'vitest'
import { buildEmailLinkOptions, buildGoogleSignInOptions } from '../google-oauth-options'

describe('buildGoogleSignInOptions', () => {
  it('forces the Google account chooser', () => {
    expect(buildGoogleSignInOptions('https://unite-group.in/api/auth/callback').queryParams).toEqual({
      prompt: 'select_account',
    })
  })

  it('keeps the callback redirect', () => {
    const url = 'https://unite-group.in/api/auth/callback?next=%2Ffounder%2Fcommand-centre'
    expect(buildGoogleSignInOptions(url).redirectTo).toBe(url)
  })
})

describe('buildEmailLinkOptions', () => {
  it('never creates a new user and returns to the callback', () => {
    const url = 'https://unite-group.in/api/auth/callback?next=%2Ffounder%2Fcommand-centre'
    expect(buildEmailLinkOptions(url)).toEqual({ emailRedirectTo: url, shouldCreateUser: false })
  })
})
