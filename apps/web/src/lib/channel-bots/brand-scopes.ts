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

/** True when a granted scope string contains any brand-only channel-bot scope. */
export function hasBrandScopes(grantedScope: string | undefined): boolean {
  const granted = new Set((grantedScope ?? '').split(/\s+/))
  return BRAND_EXTRA_SCOPES.some((s) => granted.has(s))
}

export function isBrandAccount(email: string): boolean {
  return email.trim().toLowerCase() === BRAND_ACCOUNT_EMAIL
}
