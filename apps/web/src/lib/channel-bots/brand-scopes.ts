import { BRAND_ACCOUNT_EMAIL } from './types'

// Channel bots (UNI-3223): read-only YouTube + Search Console, requested ONLY
// when connecting the brand account. Every other Google account is unchanged.
export const BRAND_EXTRA_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
]

export function withBrandScopes(baseScopes: string, email: string): string {
  return email.trim().toLowerCase() === BRAND_ACCOUNT_EMAIL
    ? [baseScopes, ...BRAND_EXTRA_SCOPES].join(' ')
    : baseScopes
}
