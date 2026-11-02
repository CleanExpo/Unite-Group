import type { PortalOwner } from './types'

// Every portal page and server action asks this one question first.
// aal1 is never access: it means "go and confirm your second factor".

export type PortalAccess =
  | { kind: 'sign_in' }
  | { kind: 'verify_second_factor' }
  | { kind: 'ok'; owner: PortalOwner }

export function decidePortalAccess(owner: PortalOwner | null): PortalAccess {
  if (!owner) return { kind: 'sign_in' }
  if (owner.aal !== 'aal2') return { kind: 'verify_second_factor' }
  return { kind: 'ok', owner }
}

/** Where the owner confirms the second factor. S1 owns that screen. SWAP: point at S1's route when it lands. */
export const PORTAL_VERIFY_PATH = '/portal/verify'

export function signInPath(returnTo: string): string {
  return `/auth/login?redirectTo=${encodeURIComponent(returnTo)}`
}

export type ActionDenied = { ok: false; code: 'sign_in' | 'verify_second_factor'; message: string }

/** For server actions: a plain refusal the form can show. */
export function deniedResult(access: Exclude<PortalAccess, { kind: 'ok' }>): ActionDenied {
  return access.kind === 'sign_in'
    ? { ok: false, code: 'sign_in', message: 'Please sign in again.' }
    : { ok: false, code: 'verify_second_factor', message: 'Please confirm it is you with your second sign-in step first.' }
}
