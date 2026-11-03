// The business-owner portal's paths. No server imports, so the proxy, the server portal module and the client
// sign-in page all share this one definition.

export const PORTAL_PATH = '/portal'
export const PORTAL_LOGIN_URL = `/auth/login?redirectTo=${encodeURIComponent(PORTAL_PATH)}`

/** Exactly /portal and pages beneath it (not '/portalx', not '/portal-admin'). */
export function isPortalPath(pathname: string): boolean {
  return pathname === PORTAL_PATH || pathname.startsWith(`${PORTAL_PATH}/`)
}

/** The second-step screen for an owner signed in with the emailed link only (aal1). */
export const PORTAL_VERIFY_PATH = '/portal/verify'

const SAFE_ORIGIN = 'https://portal.invalid'

/**
 * Where /portal/verify sends the owner afterwards. Only a portal page on this site, never the verify screen itself
 * (that would loop), never another origin, '//' or a backslash form. '/portal/../founder' resolves to '/founder' and
 * is refused. Anything else falls back to /portal.
 */
export function safePortalReturn(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return PORTAL_PATH
  let url: URL
  try {
    url = new URL(raw, SAFE_ORIGIN)
  } catch {
    return PORTAL_PATH
  }
  if (url.origin !== SAFE_ORIGIN || !isPortalPath(url.pathname) || url.pathname === PORTAL_VERIFY_PATH) return PORTAL_PATH
  return url.pathname + url.search
}
