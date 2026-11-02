// The business-owner portal's paths. No server imports, so the proxy, the server portal module and the client
// sign-in page all share this one definition.

export const PORTAL_PATH = '/portal'
export const PORTAL_LOGIN_URL = `/auth/login?redirectTo=${encodeURIComponent(PORTAL_PATH)}`

/** Exactly /portal and pages beneath it (not '/portalx', not '/portal-admin'). */
export function isPortalPath(pathname: string): boolean {
  return pathname === PORTAL_PATH || pathname.startsWith(`${PORTAL_PATH}/`)
}

/**
 * The portal pages that let a signed-in visitor past the founder allow-list: only the /portal home, which checks the
 * same owner records the invite writes (src/lib/portal/owner.ts). /portal/changes and /portal/setup still read the
 * app_metadata.portal_tenant_slug stub (src/lib/portal/changes/owner-stub.ts), which nothing writes yet, so they stay
 * behind the allow-list until they read the same owner as the home.
 */
export function isPortalOwnerPage(pathname: string): boolean {
  return pathname === PORTAL_PATH
}
