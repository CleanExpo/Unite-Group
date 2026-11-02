// The business-owner portal's paths. No server imports, so the proxy, the server portal module and the client
// sign-in page all share this one definition.

export const PORTAL_PATH = '/portal'
export const PORTAL_LOGIN_URL = `/auth/login?redirectTo=${encodeURIComponent(PORTAL_PATH)}`

/** Exactly /portal and pages beneath it (not '/portalx', not '/portal-admin'). */
export function isPortalPath(pathname: string): boolean {
  return pathname === PORTAL_PATH || pathname.startsWith(`${PORTAL_PATH}/`)
}
