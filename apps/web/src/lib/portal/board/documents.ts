import type { PortalOwner } from '@/lib/portal/changes/types'

// Board documents: a private page shown to the members of one portal tenant (IAQ Magazine first, 04/11/2026).
// The file lives in apps/web/data, never in public/, so the only way to it is /portal/board, which runs this check.

export const BOARD_PATH = '/portal/board'

export type BoardDocument = { title: string; file: string }

const BOARD_DOCUMENTS: ReadonlyMap<string, BoardDocument> = new Map([
  ['iaq-magazine', { title: 'IAQ Magazine knowledge hub concept', file: 'data/portal/iaq-magazine/board-concept.html' }],
])

/** The board document for a tenant, or null. A Map, so '__proto__' and 'constructor' are never documents. */
export function boardDocumentFor(tenantSlug: string): BoardDocument | null {
  return BOARD_DOCUMENTS.get(tenantSlug) ?? null
}

export type BoardAccess =
  | { kind: 'sign_in' }
  | { kind: 'verify_second_factor' }
  | { kind: 'not_found' }
  | { kind: 'ok'; document: BoardDocument }

/**
 * Signed out -> sign in. Signed in with no portal, or a portal with no board document -> not found (it never says
 * the page exists). A member of the right tenant on the emailed link only (aal1) -> confirm the second step.
 * Only that member on aal2 gets the document. The owner is lib/portal/owner.ts, the same one the row rules use.
 */
export function decideBoardAccess(signedIn: boolean, owner: PortalOwner | null): BoardAccess {
  if (!signedIn) return { kind: 'sign_in' }
  if (!owner) return { kind: 'not_found' }
  const document = boardDocumentFor(owner.tenantSlug)
  if (!document) return { kind: 'not_found' }
  if (owner.aal !== 'aal2') return { kind: 'verify_second_factor' }
  return { kind: 'ok', document }
}

const NONCE = /^[A-Za-z0-9+/=]{8,128}$/

/** Lets the page's own inline script run under the site's nonce CSP. Data blocks (JSON-LD) need no nonce. */
export function withScriptNonce(html: string, nonce: string | null): string {
  if (!nonce || !NONCE.test(nonce)) return html
  return html.replaceAll('<script>', `<script nonce="${nonce}">`)
}
